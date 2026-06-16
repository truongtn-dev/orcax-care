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

function futureDate(daysAhead = 7) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  date.setHours(0, 0, 0, 0);
  return date;
}

describe("UC-29 Delete Work Shift", () => {
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
    await WorkShift.deleteMany({});
    await Doctor.deleteMany({});
    await Department.deleteMany({});
    await Specialty.deleteMany({});
    await User.deleteMany({});

    admin = await User.create({
      email: "admin.delete@orcaxcare.com",
      passwordHash: "hash",
      role: "admin",
      fullName: "Delete Admin",
      isActive: true,
      isEmailVerified: true,
    });

    const specialty = await Specialty.create({ code: "ORT", name: "Orthopedics" });
    const department = await Department.create({
      name: "Bone Clinic",
      location: "D3",
      phone: "02811112222",
    });

    const doctorUser = await User.create({
      email: "doctor.delete@orcaxcare.com",
      passwordHash: "hash",
      role: "doctor",
      fullName: "Dr. Delete Test",
      isActive: true,
      isEmailVerified: true,
    });

    doctor = await Doctor.create({
      userId: doctorUser._id,
      specialtyId: specialty._id,
      departmentId: department._id,
      licenseNo: "LIC-DEL-01",
      isActive: true,
    });

    shift = await WorkShift.create({
      doctorId: doctor._id,
      dayOfWeek: 4,
      startTime: "08:00",
      endTime: "12:00",
      maxPatients: 8,
      slotDurationMin: 30,
    });
  });

  after(async () => {
    if (server) await close(server);
    await disconnectDatabase();
  });

  test("deletes shift when no future bookings exist", async () => {
    await AppointmentSlot.create({
      doctorId: doctor._id,
      workShiftId: shift._id,
      date: futureDate(3),
      startTime: "08:00",
      endTime: "08:30",
      status: "available",
    });

    const res = await fetch(`${baseUrl}/api/admin/work-shifts/${shift._id}`, {
      method: "DELETE",
      headers: { Authorization: await authHeaderFor(admin) },
    });
    assert.equal(res.status, 200);

    const remaining = await WorkShift.findById(shift._id);
    assert.equal(remaining, null);

    const slots = await AppointmentSlot.countDocuments({ workShiftId: shift._id });
    assert.equal(slots, 0);
  });

  test("deletes shift and preserves future booked slots", async () => {
    const booked = await AppointmentSlot.create({
      doctorId: doctor._id,
      workShiftId: shift._id,
      date: futureDate(5),
      startTime: "09:00",
      endTime: "09:30",
      status: "booked",
    });

    await AppointmentSlot.create({
      doctorId: doctor._id,
      workShiftId: shift._id,
      date: futureDate(5),
      startTime: "09:30",
      endTime: "10:00",
      status: "available",
    });

    const res = await fetch(`${baseUrl}/api/admin/work-shifts/${shift._id}`, {
      method: "DELETE",
      headers: { Authorization: await authHeaderFor(admin) },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.match(body.message, /booked appointment/i);
    assert.equal(body.futureBooked, 1);
    assert.equal(body.slotsRemovedIfDeleted, 1);

    const remainingShift = await WorkShift.findById(shift._id);
    assert.equal(remainingShift, null);

    const preserved = await AppointmentSlot.findById(booked._id);
    assert.ok(preserved);
    assert.equal(preserved.status, "booked");

    const openSlots = await AppointmentSlot.countDocuments({
      workShiftId: shift._id,
      status: { $in: ["available", "blocked"] },
    });
    assert.equal(openSlots, 0);
  });

  test("returns 404 for missing shift", async () => {
    const missingId = "507f1f77bcf86cd799439011";
    const res = await fetch(`${baseUrl}/api/admin/work-shifts/${missingId}`, {
      method: "DELETE",
      headers: { Authorization: await authHeaderFor(admin) },
    });
    assert.equal(res.status, 404);
  });
});
