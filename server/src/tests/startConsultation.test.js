import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, beforeEach, describe, test } from "node:test";
import http from "node:http";
import mongoose from "mongoose";
import path from "node:path";
import { createApp } from "../app.js";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { AuthToken } from "../models/AuthToken.js";
import { Appointment } from "../models/Appointment.js";
import { AppointmentSlot } from "../models/AppointmentSlot.js";
import { ClinicRoom } from "../models/ClinicRoom.js";
import { Doctor } from "../models/Doctor.js";
import { Encounter } from "../models/Encounter.js";
import { Patient } from "../models/Patient.js";
import { User } from "../models/User.js";
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

async function createDoctor({ email, fullName, licenseNo }) {
  const user = await User.create({
    email,
    passwordHash: "hash",
    role: "doctor",
    fullName,
    isActive: true,
    isEmailVerified: true,
  });
  const doctor = await Doctor.create({
    userId: user._id,
    specialtyId: new mongoose.Types.ObjectId(),
    departmentId: new mongoose.Types.ObjectId(),
    licenseNo,
    isActive: true,
  });
  return { user, doctor };
}

async function createPatient() {
  const user = await User.create({
    email: "consultation.patient@orcaxcare.com",
    passwordHash: "hash",
    role: "patient",
    fullName: "Consultation Patient",
    isActive: true,
    isEmailVerified: true,
  });
  await Patient.create({ userId: user._id, isActive: true });
  return user;
}

let roomCounter = 0;
async function createAppointment({ patientUserId, doctorId, status = "checked-in" }) {
  roomCounter++;
  const room = await ClinicRoom.create({
    name: `Consult Room ${roomCounter}`,
    roomCode: `CR101_${roomCounter}`,
    roomNumber: `101_${roomCounter}`,
    capacity: 1,
  });
  const minutes = 30 * roomCounter;
  const startHour = 9 + Math.floor(minutes / 60);
  const startMin = minutes % 60;
  const endHour = 9 + Math.floor((minutes + 30) / 60);
  const endMin = (minutes + 30) % 60;

  const pad = (n) => String(n).padStart(2, "0");
  const startTime = `${pad(startHour)}:${pad(startMin)}`;
  const endTime = `${pad(endHour)}:${pad(endMin)}`;

  const slot = await AppointmentSlot.create({
    doctorId,
    roomId: room._id,
    workShiftId: new mongoose.Types.ObjectId(),
    date: new Date("2026-06-25T00:00:00.000Z"),
    startTime,
    endTime,
    status: "booked",
  });
  return Appointment.create({
    patientUserId,
    doctorId,
    slotId: slot._id,
    status,
    reason: "Routine Checkup",
    fee: 150000,
  });
}

describe("UC-Start Consultation from Appointment", () => {
  let server;
  let baseUrl;
  let doctorUser;
  let otherDoctorUser;
  let doctor;
  let patientUser;
  let appointment;

  before(async () => {
    process.env.MONGODB_URI = "memory";
    await connectDatabase();
    server = await listen(createApp());
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  beforeEach(async () => {
    await AuthToken.deleteMany({});
    await Encounter.deleteMany({});
    await Appointment.deleteMany({});
    await AppointmentSlot.deleteMany({});
    await ClinicRoom.deleteMany({});
    await Doctor.deleteMany({});
    await Patient.deleteMany({});
    await User.deleteMany({});

    const ownDoctor = await createDoctor({
      email: "consult.doctor@orcaxcare.com",
      fullName: "Dr. Consult",
      licenseNo: "CS-001",
    });
    doctorUser = ownDoctor.user;
    doctor = ownDoctor.doctor;

    otherDoctorUser = (
      await createDoctor({
        email: "other.doctor@orcaxcare.com",
        fullName: "Dr. Other",
        licenseNo: "CS-002",
      })
    ).user;

    patientUser = await createPatient();
    appointment = await createAppointment({
      patientUserId: patientUser._id,
      doctorId: doctor._id,
      status: "checked-in",
    });
  });

  after(async () => {
    if (server) await close(server);
    await disconnectDatabase();
  });

  test("doctor starts consultation on a checked-in appointment successfully", async () => {
    const res = await fetch(`${baseUrl}/api/doctor/appointments/${appointment._id}/start-consultation`, {
      method: "POST",
      headers: { Authorization: await authHeaderFor(doctorUser) },
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body._id);
    assert.equal(body.status, "draft");
    assert.equal(body.appointment._id, appointment._id.toString());
    assert.equal(body.patient.userId, patientUser._id.toString());
    assert.equal(body.doctor._id, doctor._id.toString());

    const stored = await Encounter.findById(body._id).lean();
    assert.ok(stored);
    assert.equal(stored.status, "draft");
    assert.equal(stored.appointmentId.toString(), appointment._id.toString());
  });

  test("doctor starting consultation again returns 200 with the same encounter (idempotency)", async () => {
    const res1 = await fetch(`${baseUrl}/api/doctor/appointments/${appointment._id}/start-consultation`, {
      method: "POST",
      headers: { Authorization: await authHeaderFor(doctorUser) },
    });
    assert.equal(res1.status, 201);
    const body1 = await res1.json();

    const res2 = await fetch(`${baseUrl}/api/doctor/appointments/${appointment._id}/start-consultation`, {
      method: "POST",
      headers: { Authorization: await authHeaderFor(doctorUser) },
    });
    assert.equal(res2.status, 200);
    const body2 = await res2.json();

    assert.equal(body1._id, body2._id);
    assert.equal(body2.status, "draft");

    const count = await Encounter.countDocuments({ appointmentId: appointment._id });
    assert.equal(count, 1);
  });

  test("fails if doctor starts consultation on a non-checked-in appointment", async () => {
    const confirmedAppt = await createAppointment({
      patientUserId: patientUser._id,
      doctorId: doctor._id,
      status: "confirmed",
    });

    const res = await fetch(`${baseUrl}/api/doctor/appointments/${confirmedAppt._id}/start-consultation`, {
      method: "POST",
      headers: { Authorization: await authHeaderFor(doctorUser) },
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.message, "Appointment must be checked-in to start consultation");
  });

  test("fails with 404 if the appointment belongs to another doctor", async () => {
    const res = await fetch(`${baseUrl}/api/doctor/appointments/${appointment._id}/start-consultation`, {
      method: "POST",
      headers: { Authorization: await authHeaderFor(otherDoctorUser) },
    });

    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.message, "Appointment not found");
  });

  test("fails with 401 for unauthenticated requests", async () => {
    const res = await fetch(`${baseUrl}/api/doctor/appointments/${appointment._id}/start-consultation`, {
      method: "POST",
    });
    assert.equal(res.status, 401);
  });
});
