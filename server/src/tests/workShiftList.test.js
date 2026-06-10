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

describe("UC-19 Work Shifts List", () => {
  let server;
  let baseUrl;
  let admin;
  let doctorUser;
  let doctor;

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
      email: "admin.list@orcaxcare.com",
      passwordHash: "hash",
      role: "admin",
      fullName: "List Admin",
      isActive: true,
      isEmailVerified: true,
    });

    const specialty = await Specialty.create({ code: "CARD", name: "Cardiology" });
    const department = await Department.create({
      name: "Internal Medicine",
      location: "A1",
      phone: "02811112222",
    });

    doctorUser = await User.create({
      email: "doctor.list@orcaxcare.com",
      passwordHash: "hash",
      role: "doctor",
      fullName: "Dr. List Test",
      isActive: true,
      isEmailVerified: true,
    });

    doctor = await Doctor.create({
      userId: doctorUser._id,
      specialtyId: specialty._id,
      departmentId: department._id,
      licenseNo: "LIC-LIST-01",
      isActive: true,
    });

    await WorkShift.create([
      {
        doctorId: doctor._id,
        dayOfWeek: 1,
        startTime: "08:00",
        endTime: "12:00",
        maxPatients: 8,
        slotDurationMin: 30,
      },
      {
        doctorId: doctor._id,
        dayOfWeek: 3,
        startTime: "13:00",
        endTime: "17:00",
        maxPatients: 8,
        slotDurationMin: 30,
      },
    ]);
  });

  after(async () => {
    if (server) await close(server);
    await disconnectDatabase();
  });

  test("admin lists all shifts with weekly pattern", async () => {
    const res = await fetch(`${baseUrl}/api/admin/work-shifts`, {
      headers: { Authorization: await authHeaderFor(admin) },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.total, 2);
    assert.equal(body.weeklyPattern.length, 7);
    assert.equal(body.weeklyPattern[1].shifts.length, 1);
    assert.equal(body.weeklyPattern[3].shifts.length, 1);
  });

  test("admin filters shifts by doctor", async () => {
    const res = await fetch(`${baseUrl}/api/admin/work-shifts?doctorId=${doctor._id}`, {
      headers: { Authorization: await authHeaderFor(admin) },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.total, 2);
    assert.ok(body.items.every((item) => item.doctorId === doctor._id.toString()));
  });

  test("doctor sees only own weekly shifts", async () => {
    const res = await fetch(`${baseUrl}/api/doctor/work-shifts`, {
      headers: { Authorization: await authHeaderFor(doctorUser) },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.total, 2);
    assert.equal(body.doctor.fullName, "Dr. List Test");
    assert.equal(body.weeklyPattern[1].shifts[0].startTime, "08:00");
  });
});
