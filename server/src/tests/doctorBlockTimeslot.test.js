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

describe("UC-20 Block/Unlock Timeslot", () => {
  let server;
  let baseUrl;
  let doctorUser;
  let doctor;
  let shift;
  let availableSlot;
  let bookedSlot;

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

    const specialty = await Specialty.create({ code: "ENT", name: "ENT" });
    const department = await Department.create({
      name: "ENT Clinic",
      location: "F1",
      phone: "02811112222",
    });

    doctorUser = await User.create({
      email: "doctor.block@orcaxcare.com",
      passwordHash: "hash",
      role: "doctor",
      fullName: "Dr. Block Test",
      isActive: true,
      isEmailVerified: true,
    });

    doctor = await Doctor.create({
      userId: doctorUser._id,
      specialtyId: specialty._id,
      departmentId: department._id,
      licenseNo: "LIC-BLK-01",
      isActive: true,
    });

    shift = await WorkShift.create({
      doctorId: doctor._id,
      dayOfWeek: 1,
      startTime: "08:00",
      endTime: "10:00",
      maxPatients: 4,
      slotDurationMin: 30,
    });

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 3);
    targetDate.setHours(0, 0, 0, 0);

    availableSlot = await AppointmentSlot.create({
      doctorId: doctor._id,
      workShiftId: shift._id,
      date: targetDate,
      startTime: "08:00",
      endTime: "08:30",
      status: "available",
    });

    bookedSlot = await AppointmentSlot.create({
      doctorId: doctor._id,
      workShiftId: shift._id,
      date: targetDate,
      startTime: "08:30",
      endTime: "09:00",
      status: "booked",
    });
  });

  after(async () => {
    if (server) await close(server);
    await disconnectDatabase();
  });

  test("blocks an available slot", async () => {
    const res = await fetch(`${baseUrl}/api/doctor/appointment-slots/${availableSlot._id}/block`, {
      method: "PUT",
      headers: { Authorization: await authHeaderFor(doctorUser) },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, "blocked");

    const stored = await AppointmentSlot.findById(availableSlot._id);
    assert.equal(stored.status, "blocked");
  });

  test("unblocks a blocked slot back to available", async () => {
    availableSlot.status = "blocked";
    await availableSlot.save();

    const res = await fetch(`${baseUrl}/api/doctor/appointment-slots/${availableSlot._id}/unblock`, {
      method: "PUT",
      headers: { Authorization: await authHeaderFor(doctorUser) },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, "available");
  });

  test("rejects blocking a booked slot", async () => {
    const res = await fetch(`${baseUrl}/api/doctor/appointment-slots/${bookedSlot._id}/block`, {
      method: "PUT",
      headers: { Authorization: await authHeaderFor(doctorUser) },
    });
    assert.equal(res.status, 409);
  });
});
