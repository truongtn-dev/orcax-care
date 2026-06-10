import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, beforeEach, describe, test } from "node:test";
import http from "node:http";
import path from "node:path";
import { createApp } from "../app.js";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
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

describe("UC-29 Update Work Shift", () => {
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
    await WorkShift.deleteMany({});
    await Doctor.deleteMany({});
    await Department.deleteMany({});
    await Specialty.deleteMany({});
    await User.deleteMany({});

    admin = await User.create({
      email: "admin.update@orcaxcare.com",
      passwordHash: "hash",
      role: "admin",
      fullName: "Update Admin",
      isActive: true,
      isEmailVerified: true,
    });

    const specialty = await Specialty.create({ code: "DERM", name: "Dermatology" });
    const department = await Department.create({
      name: "Skin Clinic",
      location: "B2",
      phone: "02811112222",
    });

    const doctorUser = await User.create({
      email: "doctor.update@orcaxcare.com",
      passwordHash: "hash",
      role: "doctor",
      fullName: "Dr. Update Test",
      isActive: true,
      isEmailVerified: true,
    });

    doctor = await Doctor.create({
      userId: doctorUser._id,
      specialtyId: specialty._id,
      departmentId: department._id,
      licenseNo: "LIC-UPD-01",
      isActive: true,
    });

    shift = await WorkShift.create({
      doctorId: doctor._id,
      dayOfWeek: 2,
      startTime: "08:00",
      endTime: "12:00",
      maxPatients: 8,
      slotDurationMin: 30,
    });

    await WorkShift.create({
      doctorId: doctor._id,
      dayOfWeek: 2,
      startTime: "13:00",
      endTime: "17:00",
      maxPatients: 8,
      slotDurationMin: 30,
    });
  });

  after(async () => {
    if (server) await close(server);
    await disconnectDatabase();
  });

  test("updates hours and capacity", async () => {
    const res = await fetch(`${baseUrl}/api/admin/work-shifts/${shift._id}`, {
      method: "PUT",
      headers: {
        Authorization: await authHeaderFor(admin),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startTime: "09:00",
        endTime: "11:00",
        maxPatients: 4,
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.startTime, "09:00");
    assert.equal(body.endTime, "11:00");
    assert.equal(body.maxPatients, 4);
    assert.equal(body.slotDurationMin, 30);
    assert.ok(body.note);
  });

  test("rejects overlapping hours on update", async () => {
    const res = await fetch(`${baseUrl}/api/admin/work-shifts/${shift._id}`, {
      method: "PUT",
      headers: {
        Authorization: await authHeaderFor(admin),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        endTime: "14:00",
      }),
    });
    assert.equal(res.status, 409);
    const body = await res.json();
    assert.match(body.message, /trùng/i);
  });

  test("returns 404 for missing shift", async () => {
    const missingId = "507f1f77bcf86cd799439011";
    const res = await fetch(`${baseUrl}/api/admin/work-shifts/${missingId}`, {
      method: "PUT",
      headers: {
        Authorization: await authHeaderFor(admin),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ maxPatients: 6 }),
    });
    assert.equal(res.status, 404);
  });
});
