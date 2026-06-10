import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, beforeEach, describe, test } from "node:test";
import http from "node:http";
import path from "node:path";
import { createApp } from "../app.js";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { AuthToken } from "../models/AuthToken.js";
import { ClinicRoom } from "../models/ClinicRoom.js";
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

describe("Create Work Shift (UC Iter2 #1)", () => {
  let server;
  let baseUrl;
  let admin;
  let doctor;
  let room;

  before(async () => {
    process.env.MONGODB_URI = "memory";
    await connectDatabase();
    server = await listen(createApp());
    const address = server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  beforeEach(async () => {
    await AuthToken.deleteMany({});
    await WorkShift.deleteMany({});
    await Doctor.deleteMany({});
    await ClinicRoom.deleteMany({});
    await Department.deleteMany({});
    await Specialty.deleteMany({});
    await User.deleteMany({});

    admin = await User.create({
      email: "admin.shift@orcaxcare.com",
      passwordHash: "hash",
      role: "admin",
      fullName: "Shift Admin",
      isActive: true,
      isEmailVerified: true,
    });

    const specialty = await Specialty.create({ code: "PED", name: "Pediatrics" });
    const department = await Department.create({
      name: "Pediatrics Ward",
      location: "C1",
      phone: "02811112222",
    });

    const doctorUser = await User.create({
      email: "doctor.shift@orcaxcare.com",
      passwordHash: "hash",
      role: "doctor",
      fullName: "Dr. Shift Test",
      isActive: true,
      isEmailVerified: true,
    });

    doctor = await Doctor.create({
      userId: doctorUser._id,
      specialtyId: specialty._id,
      departmentId: department._id,
      licenseNo: "LIC-SHIFT-01",
      isActive: true,
    });

    room = await ClinicRoom.create({
      roomNumber: "P-101",
      name: "Pediatrics Room 101",
      departmentId: department._id,
      specialtyId: specialty._id,
      isActive: true,
    });
  });

  after(async () => {
    if (server) await close(server);
    await disconnectDatabase();
  });

  test("creates weekly shift template for doctor", async () => {
    const res = await fetch(`${baseUrl}/api/admin/work-shifts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: await authHeaderFor(admin),
      },
      body: JSON.stringify({
        doctorId: doctor._id.toString(),
        roomId: room._id.toString(),
        dayOfWeek: 1,
        startTime: "08:00",
        endTime: "12:00",
        maxPatients: 8,
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.doctorId, doctor._id.toString());
    assert.equal(body.dayOfWeek, 1);
    assert.equal(body.dayLabel, "Thứ 2");
    assert.equal(body.startTime, "08:00");
    assert.equal(body.endTime, "12:00");
    assert.equal(body.maxPatients, 8);
    assert.equal(body.slotDurationMin, 30);
    assert.equal(body.roomName, "Pediatrics Room 101");
  });

  test("rejects overlapping shift for same doctor and day", async () => {
    const auth = await authHeaderFor(admin);
    const payload = {
      doctorId: doctor._id.toString(),
      dayOfWeek: 2,
      startTime: "09:00",
      endTime: "11:00",
      maxPatients: 4,
    };

    const first = await fetch(`${baseUrl}/api/admin/work-shifts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth },
      body: JSON.stringify(payload),
    });
    assert.equal(first.status, 201);

    const second = await fetch(`${baseUrl}/api/admin/work-shifts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth },
      body: JSON.stringify({
        ...payload,
        startTime: "10:30",
        endTime: "12:30",
      }),
    });

    assert.equal(second.status, 409);
    const body = await second.json();
    assert.match(body.message, /trùng/i);
  });

  test("requires admin authentication", async () => {
    const res = await fetch(`${baseUrl}/api/admin/work-shifts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        doctorId: doctor._id.toString(),
        dayOfWeek: 3,
        startTime: "13:00",
        endTime: "17:00",
        maxPatients: 6,
      }),
    });
    assert.equal(res.status, 401);
  });
});
