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
import { Holiday } from "../models/Holiday.js";
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

function nextWeekdayDate(targetDayOfWeek) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  while (date.getDay() !== targetDayOfWeek) {
    date.setDate(date.getDate() + 1);
  }
  return date;
}

function formatDateOnly(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

describe("UC-29 Generate Appointment Slots", () => {
  let server;
  let baseUrl;
  let admin;
  let doctor;
  let shift;

  before(async () => {
    process.env.MONGODB_URI = "memory";
    await connectDatabase();
    server = await listen(createApp());
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  beforeEach(async () => {
    await AuthToken.deleteMany({});
    await AppointmentSlot.deleteMany({});
    await Holiday.deleteMany({});
    await WorkShift.deleteMany({});
    await Doctor.deleteMany({});
    await Department.deleteMany({});
    await Specialty.deleteMany({});
    await User.deleteMany({});

    admin = await User.create({
      email: "admin.generate@orcaxcare.com",
      passwordHash: "hash",
      role: "admin",
      fullName: "Generate Admin",
      isActive: true,
      isEmailVerified: true,
    });

    const specialty = await Specialty.create({ code: "NEU", name: "Neurology" });
    const department = await Department.create({
      name: "Neuro Clinic",
      location: "E1",
      phone: "02811112222",
    });

    const doctorUser = await User.create({
      email: "doctor.generate@orcaxcare.com",
      passwordHash: "hash",
      role: "doctor",
      fullName: "Dr. Generate Test",
      isActive: true,
      isEmailVerified: true,
    });

    doctor = await Doctor.create({
      userId: doctorUser._id,
      specialtyId: specialty._id,
      departmentId: department._id,
      licenseNo: "LIC-GEN-01",
      isActive: true,
    });

    shift = await WorkShift.create({
      doctorId: doctor._id,
      dayOfWeek: 2,
      startTime: "08:00",
      endTime: "10:00",
      maxPatients: 4,
      slotDurationMin: 30,
    });
  });

  after(async () => {
    if (server) await close(server);
    await disconnectDatabase();
  });

  test("batch creates slots from active shifts", async () => {
    const targetDate = nextWeekdayDate(2);
    const dateText = formatDateOnly(targetDate);

    const res = await fetch(`${baseUrl}/api/admin/appointment-slots/generate`, {
      method: "POST",
      headers: {
        Authorization: await authHeaderFor(admin),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: dateText,
        endDate: dateText,
        doctorId: doctor._id.toString(),
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.created, 4);
    assert.equal(body.skipped, 0);
    assert.equal(body.shiftsProcessed, 1);

    const slots = await AppointmentSlot.find({ workShiftId: shift._id }).sort({ startTime: 1 });
    assert.equal(slots.length, 4);
    assert.equal(slots[0].startTime, "08:00");
    assert.equal(slots[3].endTime, "10:00");
  });

  test("skips holidays and avoids duplicate slot times", async () => {
    const targetDate = nextWeekdayDate(2);
    const dateText = formatDateOnly(targetDate);

    await Holiday.create({
      date: new Date(`${dateText}T00:00:00`),
      name: "Clinic holiday",
      isActive: true,
    });

    const first = await fetch(`${baseUrl}/api/admin/appointment-slots/generate`, {
      method: "POST",
      headers: {
        Authorization: await authHeaderFor(admin),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: dateText,
        endDate: dateText,
        doctorId: doctor._id.toString(),
      }),
    });
    assert.equal(first.status, 201);
    const holidayBody = await first.json();
    assert.equal(holidayBody.created, 0);
    assert.equal(holidayBody.holidaysSkipped, 1);

    await Holiday.deleteMany({});

    const second = await fetch(`${baseUrl}/api/admin/appointment-slots/generate`, {
      method: "POST",
      headers: {
        Authorization: await authHeaderFor(admin),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: dateText,
        endDate: dateText,
        doctorId: doctor._id.toString(),
      }),
    });
    assert.equal(second.status, 201);
    const createBody = await second.json();
    assert.equal(createBody.created, 4);

    const third = await fetch(`${baseUrl}/api/admin/appointment-slots/generate`, {
      method: "POST",
      headers: {
        Authorization: await authHeaderFor(admin),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: dateText,
        endDate: dateText,
        doctorId: doctor._id.toString(),
      }),
    });
    assert.equal(third.status, 201);
    const duplicateBody = await third.json();
    assert.equal(duplicateBody.created, 0);
    assert.equal(duplicateBody.skipped, 4);
  });
});
