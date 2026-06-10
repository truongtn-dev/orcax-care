import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, beforeEach, describe, test } from "node:test";
import http from "node:http";
import path from "node:path";
import { createApp } from "../app.js";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { AppointmentSlot } from "../models/AppointmentSlot.js";
import { AuthToken } from "../models/AuthToken.js";
import { Department } from "../models/Department.js";
import { Doctor } from "../models/Doctor.js";
import { Specialty } from "../models/Specialty.js";
import { User } from "../models/User.js";
import { WorkShift } from "../models/WorkShift.js";
import { issueAuthToken } from "../services/token.service.js";

const testDir = path.dirname(fileURLToPath(import.meta.url));
process.env.MONGOMS_DOWNLOAD_DIR = path.resolve(testDir, "../../.cache/mongodb-binaries");

function listen(app) {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, () => resolve(server));
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

async function authHeaderFor(user) {
  const session = await issueAuthToken(user._id);
  return `Token ${session.plainToken}`;
}

function formatDateOnly(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

describe("UC-20 Doctor Schedule Calendar", () => {
  let server;
  let baseUrl;
  let doctorUser;
  let doctor;
  let shift;
  let slotAvailable;
  let slotBooked;
  let targetDate;

  before(async () => {
    process.env.MONGODB_URI = "memory";
    await connectDatabase();
    server = await listen(createApp());
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  beforeEach(async () => {
    await AuthToken.deleteMany({});
    await AppointmentSlot.deleteMany({});
    await WorkShift.deleteMany({});
    await Doctor.deleteMany({});
    await Department.deleteMany({});
    await Specialty.deleteMany({});
    await User.deleteMany({});

    const specialty = await Specialty.create({ code: "GP", name: "General Practice" });
    const department = await Department.create({
      name: "General Clinic",
      location: "A1",
      phone: "02811112222",
    });

    doctorUser = await User.create({
      email: "doctor.calendar@orcaxcare.com",
      passwordHash: "hash",
      role: "doctor",
      fullName: "Dr. Calendar Test",
      isActive: true,
      isEmailVerified: true,
    });

    doctor = await Doctor.create({
      userId: doctorUser._id,
      specialtyId: specialty._id,
      departmentId: department._id,
      licenseNo: "LIC-CAL-01",
      isActive: true,
    });

    shift = await WorkShift.create({
      doctorId: doctor._id,
      dayOfWeek: 3,
      startTime: "08:00",
      endTime: "10:00",
      maxPatients: 4,
      slotDurationMin: 30,
    });

    targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2);
    targetDate.setHours(0, 0, 0, 0);

    slotAvailable = await AppointmentSlot.create({
      doctorId: doctor._id,
      workShiftId: shift._id,
      date: targetDate,
      startTime: "08:00",
      endTime: "08:30",
      status: "available",
    });

    slotBooked = await AppointmentSlot.create({
      doctorId: doctor._id,
      workShiftId: shift._id,
      date: targetDate,
      startTime: "08:30",
      endTime: "09:00",
      status: "booked",
    });

    await AppointmentSlot.create({
      doctorId: doctor._id,
      workShiftId: shift._id,
      date: targetDate,
      startTime: "09:00",
      endTime: "09:30",
      status: "blocked",
    });
  });

  after(async () => {
    if (server) await close(server);
    await disconnectDatabase();
  });

  test("returns week calendar with status summary", async () => {
    const dateText = formatDateOnly(targetDate);
    const res = await fetch(`${baseUrl}/api/doctor/schedule?startDate=${dateText}&endDate=${dateText}`, {
      headers: { Authorization: await authHeaderFor(doctorUser) },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.doctor.fullName, "Dr. Calendar Test");
    assert.equal(body.summary.total, 3);
    assert.equal(body.summary.available, 1);
    assert.equal(body.summary.booked, 1);
    assert.equal(body.summary.blocked, 1);
    assert.equal(body.days.length, 1);
    assert.equal(body.days[0].slots.length, 3);
  });

  test("returns slot detail for own appointment slot", async () => {
    const res = await fetch(`${baseUrl}/api/doctor/appointment-slots/${slotBooked._id}`, {
      headers: { Authorization: await authHeaderFor(doctorUser) },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body._id, slotBooked._id.toString());
    assert.equal(body.status, "booked");
    assert.equal(body.startTime, "08:30");
  });

  test("hides another doctor slot detail", async () => {
    const otherUser = await User.create({
      email: "doctor.other@orcaxcare.com",
      passwordHash: "hash",
      role: "doctor",
      fullName: "Dr. Other",
      isActive: true,
      isEmailVerified: true,
    });

    const res = await fetch(`${baseUrl}/api/doctor/appointment-slots/${slotAvailable._id}`, {
      headers: { Authorization: await authHeaderFor(otherUser) },
    });

    assert.equal(res.status, 404);
  });
});
