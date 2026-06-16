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
import { Patient } from "../models/Patient.js";
import { User } from "../models/User.js";
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

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
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

async function createPatient({ email, fullName }) {
  const user = await User.create({
    email,
    passwordHash: "hash",
    role: "patient",
    fullName,
    isActive: true,
    isEmailVerified: true,
  });
  await Patient.create({ userId: user._id, isActive: true });
  return user;
}

async function createSlot({ doctorId, roomId, date, startTime, endTime }) {
  return AppointmentSlot.create({
    doctorId,
    roomId,
    workShiftId: new mongoose.Types.ObjectId(),
    date,
    startTime,
    endTime,
    status: "booked",
  });
}

async function createAppointment({ patientUserId, doctorId, slotId, status, reason = "Today visit" }) {
  return Appointment.create({
    patientUserId,
    doctorId,
    slotId,
    status,
    reason,
    fee: 200000,
  });
}

describe("UC-17 View Today Appointments", () => {
  let server;
  let baseUrl;
  let doctorUser;
  let doctor;
  let otherDoctor;
  let patientA;
  let patientB;
  let room;
  let morningAppointment;
  let afternoonAppointment;
  let otherDoctorAppointment;

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
    await ClinicRoom.deleteMany({});
    await Doctor.deleteMany({});
    await Patient.deleteMany({});
    await User.deleteMany({});

    const own = await createDoctor({
      email: "doctor.today@orcaxcare.com",
      fullName: "Dr. Today",
      licenseNo: "TD-001",
    });
    doctorUser = own.user;
    doctor = own.doctor;
    otherDoctor = (
      await createDoctor({
        email: "doctor.other.today@orcaxcare.com",
        fullName: "Dr. Other",
        licenseNo: "TD-002",
      })
    ).doctor;

    patientA = await createPatient({
      email: "patient.today.a@orcaxcare.com",
      fullName: "Patient A",
    });
    patientB = await createPatient({
      email: "patient.today.b@orcaxcare.com",
      fullName: "Patient B",
    });
    const patientC = await createPatient({
      email: "patient.today.c@orcaxcare.com",
      fullName: "Patient C",
    });

    room = await ClinicRoom.create({
      name: "Room 401",
      roomCode: "TD401",
      roomNumber: "401",
      capacity: 1,
    });

    const today = startOfToday();
    const yesterday = addDays(today, -1);
    const tomorrow = addDays(today, 1);

    const morningSlot = await createSlot({
      doctorId: doctor._id,
      roomId: room._id,
      date: today,
      startTime: "08:00",
      endTime: "08:30",
    });
    const afternoonSlot = await createSlot({
      doctorId: doctor._id,
      roomId: room._id,
      date: today,
      startTime: "15:00",
      endTime: "15:30",
    });
    const otherDoctorSlot = await createSlot({
      doctorId: otherDoctor._id,
      roomId: room._id,
      date: today,
      startTime: "09:00",
      endTime: "09:30",
    });
    const yesterdaySlot = await createSlot({
      doctorId: doctor._id,
      roomId: room._id,
      date: yesterday,
      startTime: "10:00",
      endTime: "10:30",
    });
    const tomorrowSlot = await createSlot({
      doctorId: doctor._id,
      roomId: room._id,
      date: tomorrow,
      startTime: "11:00",
      endTime: "11:30",
    });

    morningAppointment = await createAppointment({
      patientUserId: patientA._id,
      doctorId: doctor._id,
      slotId: morningSlot._id,
      status: "confirmed",
    });
    afternoonAppointment = await createAppointment({
      patientUserId: patientB._id,
      doctorId: doctor._id,
      slotId: afternoonSlot._id,
      status: "completed",
    });
    otherDoctorAppointment = await createAppointment({
      patientUserId: patientC._id,
      doctorId: otherDoctor._id,
      slotId: otherDoctorSlot._id,
      status: "confirmed",
    });
    await createAppointment({
      patientUserId: patientA._id,
      doctorId: doctor._id,
      slotId: yesterdaySlot._id,
      status: "confirmed",
    });
    await createAppointment({
      patientUserId: patientB._id,
      doctorId: doctor._id,
      slotId: tomorrowSlot._id,
      status: "confirmed",
    });
  });

  after(async () => {
    if (server) await close(server);
    await disconnectDatabase();
  });

  test("lists only authenticated doctor's appointments for today sorted ascending", async () => {
    const res = await fetch(`${baseUrl}/api/doctor/appointments/today`, {
      headers: { Authorization: await authHeaderFor(doctorUser) },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.date, formatDateOnly(startOfToday()));
    assert.equal(body.total, 2);
    assert.equal(body.items[0].patientName, "Patient A");
    assert.equal(body.items[0].slot.startTime, "08:00");
    assert.match(body.items[0].referenceCode, /^APT-[A-F0-9]{6}$/);
    assert.equal(body.items[0].referenceCode, `APT-${morningAppointment._id.toString().slice(-6).toUpperCase()}`);
    assert.equal(body.items[1].patientName, "Patient B");
    assert.equal(body.items[1].slot.startTime, "15:00");
  });

  test("filters today's appointments by status", async () => {
    const res = await fetch(`${baseUrl}/api/doctor/appointments/today?status=completed`, {
      headers: { Authorization: await authHeaderFor(doctorUser) },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.total, 1);
    assert.equal(body.items[0].patientName, "Patient B");
    assert.equal(body.items[0].status, "completed");
  });

  test("sorts today's appointments by time descending", async () => {
    const res = await fetch(`${baseUrl}/api/doctor/appointments/today?sort=desc`, {
      headers: { Authorization: await authHeaderFor(doctorUser) },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.items[0]._id, afternoonAppointment._id.toString());
    assert.equal(body.items[1]._id, morningAppointment._id.toString());
  });

  test("does not open another doctor's appointment detail", async () => {
    const res = await fetch(`${baseUrl}/api/doctor/appointments/${otherDoctorAppointment._id}`, {
      headers: { Authorization: await authHeaderFor(doctorUser) },
    });

    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.message, "Appointment not found");
  });
});
