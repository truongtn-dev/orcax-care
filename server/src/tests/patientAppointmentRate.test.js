import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, beforeEach, describe, test } from "node:test";
import http from "node:http";
import mongoose from "mongoose";
import path from "node:path";
import { createApp } from "../app.js";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { DEFAULT_CONSULTATION_FEE_VND } from "../config/booking.js";
import { Appointment } from "../models/Appointment.js";
import { AppointmentSlot } from "../models/AppointmentSlot.js";
import { AuthToken } from "../models/AuthToken.js";
import { Department } from "../models/Department.js";
import { Doctor } from "../models/Doctor.js";
import { Specialty } from "../models/Specialty.js";
import { User } from "../models/User.js";
import { WorkShift } from "../models/WorkShift.js";
import { issueAuthToken } from "../services/token.service.js";
import { formatDateOnly } from "../utils/shiftTime.js";

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

function pastDate(daysAgo = 1) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(0, 0, 0, 0);
  return date;
}

describe("UC-8.1.3 Rate Doctor", () => {
  let server;
  let baseUrl;
  let patientUser;
  let doctor;
  let pastSlot;
  let appointment;

  before(async () => {
    process.env.MONGODB_URI = "memory";
    await connectDatabase();
    server = await listen(createApp());
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  beforeEach(async () => {
    await AuthToken.deleteMany({});
    await Appointment.deleteMany({});
    await AppointmentSlot.deleteMany({});
    await WorkShift.deleteMany({});
    await Doctor.deleteMany({});
    await Department.deleteMany({});
    await Specialty.deleteMany({});
    await User.deleteMany({});

    const specialty = await Specialty.create({ code: "GEN", name: "General Medicine" });
    const department = await Department.create({
      name: "General Clinic",
      location: "F1",
      phone: "02811113333",
    });

    patientUser = await User.create({
      email: "patient.rate@orcaxcare.com",
      passwordHash: "hash",
      role: "patient",
      fullName: "Rate Patient",
      isActive: true,
      isEmailVerified: true,
    });

    const doctorUser = await User.create({
      email: "doctor.rate@orcaxcare.com",
      passwordHash: "hash",
      role: "doctor",
      fullName: "Dr. Rate Test",
      isActive: true,
      isEmailVerified: true,
    });

    doctor = await Doctor.create({
      userId: doctorUser._id,
      specialtyId: specialty._id,
      departmentId: department._id,
      licenseNo: "RATE-001",
      isActive: true,
      ratingAverage: 0,
      ratingCount: 0,
    });

    const workShift = await WorkShift.create({
      doctorId: doctor._id,
      dayOfWeek: pastDate().getDay(),
      startTime: "08:00",
      endTime: "12:00",
      maxPatients: 4,
      slotDurationMin: 30,
      isActive: true,
    });

    pastSlot = await AppointmentSlot.create({
      doctorId: doctor._id,
      workShiftId: workShift._id,
      date: pastDate(),
      startTime: "09:00",
      endTime: "09:30",
      status: "booked",
    });

    appointment = await Appointment.create({
      patientUserId: patientUser._id,
      doctorId: doctor._id,
      slotId: pastSlot._id,
      status: "confirmed",
      reason: "Past visit",
      fee: DEFAULT_CONSULTATION_FEE_VND,
    });
  });

  after(async () => {
    if (server) await close(server);
    await disconnectDatabase();
  });

  test("GET /api/patient/appointments returns rating fields for past visits", async () => {
    const res = await fetch(`${baseUrl}/api/patient/appointments`, {
      headers: { Authorization: await authHeaderFor(patientUser) },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.items.length, 1);
    assert.equal(body.items[0].rating, null);
    assert.equal(body.items[0].reviewComment, "");
    assert.equal(body.items[0].slot.date, formatDateOnly(pastDate()));
  });

  test("POST /api/patient/appointments/:id/rate saves review and updates doctor average", async () => {
    const auth = await authHeaderFor(patientUser);
    const res = await fetch(`${baseUrl}/api/patient/appointments/${appointment._id}/rate`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ rating: 4, comment: "Very helpful consultation." }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.rating, 4);
    assert.equal(body.reviewComment, "Very helpful consultation.");
    assert.equal(body.status, "completed");
    assert.ok(body.reviewedAt);

    const storedDoctor = await Doctor.findById(doctor._id).lean();
    assert.equal(storedDoctor.ratingCount, 1);
    assert.equal(storedDoctor.ratingAverage, 4);
  });

  test("POST /api/patient/appointments/:id/rate rejects duplicate reviews", async () => {
    const auth = await authHeaderFor(patientUser);

    await fetch(`${baseUrl}/api/patient/appointments/${appointment._id}/rate`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ rating: 5, comment: "First review" }),
    });

    const res = await fetch(`${baseUrl}/api/patient/appointments/${appointment._id}/rate`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ rating: 3, comment: "Second review" }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.message, /already been rated/i);
  });

  test("POST /api/patient/appointments/:id/rate rejects future appointments", async () => {
    const futureSlot = await AppointmentSlot.create({
      doctorId: doctor._id,
      workShiftId: pastSlot.workShiftId,
      date: (() => {
        const date = new Date();
        date.setDate(date.getDate() + 7);
        date.setHours(0, 0, 0, 0);
        return date;
      })(),
      startTime: "10:00",
      endTime: "10:30",
      status: "booked",
    });

    const futureAppointment = await Appointment.create({
      patientUserId: patientUser._id,
      doctorId: doctor._id,
      slotId: futureSlot._id,
      status: "confirmed",
      reason: "Future visit",
      fee: DEFAULT_CONSULTATION_FEE_VND,
    });

    const res = await fetch(`${baseUrl}/api/patient/appointments/${futureAppointment._id}/rate`, {
      method: "POST",
      headers: {
        Authorization: await authHeaderFor(patientUser),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ rating: 5, comment: "Too early" }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.message, /before the visit has ended/i);
  });
});
