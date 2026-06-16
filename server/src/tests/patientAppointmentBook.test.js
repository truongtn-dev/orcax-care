import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, beforeEach, describe, test } from "node:test";
import http from "node:http";
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
import { Wallet } from "../models/Wallet.js";
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

describe("Patient booking — availability & appointments", () => {
  let server;
  let baseUrl;
  let doctor;
  let patientUser;
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
    await Appointment.deleteMany({});
    await AppointmentSlot.deleteMany({});
    await WorkShift.deleteMany({});
    await Wallet.deleteMany({});
    await Doctor.deleteMany({});
    await Department.deleteMany({});
    await Specialty.deleteMany({});
    await User.deleteMany({});

    const specialty = await Specialty.create({ code: "CAR", name: "Cardiology" });
    const department = await Department.create({
      name: "Cardiology Clinic",
      location: "F2",
      phone: "02811112222",
    });

    const doctorUser = await User.create({
      email: "doctor.book@orcaxcare.com",
      passwordHash: "hash",
      role: "doctor",
      fullName: "Dr. Book Test",
      isActive: true,
      isEmailVerified: true,
    });

    doctor = await Doctor.create({
      userId: doctorUser._id,
      specialtyId: specialty._id,
      departmentId: department._id,
      licenseNo: "LIC-BOOK-01",
      isActive: true,
    });

    patientUser = await User.create({
      email: "patient.book@orcaxcare.com",
      passwordHash: "hash",
      role: "patient",
      fullName: "Patient Book Test",
      isActive: true,
      isEmailVerified: true,
    });

    await Wallet.create({ userId: patientUser._id, balance: DEFAULT_CONSULTATION_FEE_VND + 50000 });

    const shift = await WorkShift.create({
      doctorId: doctor._id,
      dayOfWeek: 1,
      startTime: "08:00",
      endTime: "10:00",
      maxPatients: 4,
      slotDurationMin: 30,
    });

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 5);
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
    await close(server);
    await disconnectDatabase();
  });

  test("GET /api/public/doctors/:id/availability returns only bookable slots", async () => {
    const startDate = formatDateOnly(availableSlot.date);
    const res = await fetch(
      `${baseUrl}/api/public/doctors/${doctor._id}/availability?startDate=${startDate}&endDate=${startDate}`
    );
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.summary.available, 1);
    assert.equal(body.days[0].slots.length, 1);
    assert.equal(body.days[0].slots[0].startTime, "08:00");
    assert.equal(body.consultationFee, DEFAULT_CONSULTATION_FEE_VND);
  });

  test("POST /api/patient/appointments books slot and deducts wallet", async () => {
    const auth = await authHeaderFor(patientUser);
    const res = await fetch(`${baseUrl}/api/patient/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth },
      body: JSON.stringify({ slotId: availableSlot._id.toString(), reason: "Chest pain follow-up" }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.appointment.status, "confirmed");
    assert.equal(body.appointment.fee, DEFAULT_CONSULTATION_FEE_VND);
    assert.equal(body.wallet.balance, 50000);

    const slot = await AppointmentSlot.findById(availableSlot._id).lean();
    assert.equal(slot.status, "booked");

    const appointments = await Appointment.find({ patientUserId: patientUser._id }).lean();
    assert.equal(appointments.length, 1);
  });

  test("POST /api/patient/appointments rejects unavailable slot", async () => {
    const auth = await authHeaderFor(patientUser);
    const res = await fetch(`${baseUrl}/api/patient/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth },
      body: JSON.stringify({ slotId: bookedSlot._id.toString() }),
    });
    assert.equal(res.status, 409);
  });

  test("POST /api/patient/appointments rejects insufficient wallet balance", async () => {
    await Wallet.findOneAndUpdate({ userId: patientUser._id }, { balance: 1000 });

    const freshSlot = await AppointmentSlot.create({
      doctorId: doctor._id,
      workShiftId: (await WorkShift.findOne())._id,
      date: availableSlot.date,
      startTime: "09:00",
      endTime: "09:30",
      status: "available",
    });

    const auth = await authHeaderFor(patientUser);
    const res = await fetch(`${baseUrl}/api/patient/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth },
      body: JSON.stringify({ slotId: freshSlot._id.toString() }),
    });
    assert.equal(res.status, 409);
    const body = await res.json();
    assert.match(body.message, /Insufficient wallet balance/i);

    const slot = await AppointmentSlot.findById(freshSlot._id).lean();
    assert.equal(slot.status, "available");
  });

  test("GET /api/patient/appointments lists patient bookings", async () => {
    const auth = await authHeaderFor(patientUser);
    await fetch(`${baseUrl}/api/patient/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth },
      body: JSON.stringify({ slotId: availableSlot._id.toString() }),
    });

    const res = await fetch(`${baseUrl}/api/patient/appointments`, {
      headers: { Authorization: auth },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.items.length, 1);
    assert.equal(body.items[0].doctor.fullName, "Dr. Book Test");
  });
});
