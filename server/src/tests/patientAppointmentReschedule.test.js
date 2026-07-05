import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, beforeEach, describe, test } from "node:test";
import http from "node:http";
import mongoose from "mongoose";
import path from "node:path";
import { createApp } from "../app.js";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { AuthToken } from "../models/AuthToken.js";
import { AppointmentSlot } from "../models/AppointmentSlot.js";
import { ClinicRoom } from "../models/ClinicRoom.js";
import { Doctor } from "../models/Doctor.js";
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

function dateOnly(value) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setHours(0, 0, 0, 0);
  return date;
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

function formatDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

async function createSlot({ doctorId, roomId, date, startTime, endTime, status }) {
  return AppointmentSlot.create({
    doctorId,
    roomId,
    workShiftId: new mongoose.Types.ObjectId(),
    date: dateOnly(date),
    startTime,
    endTime,
    status,
  });
}

describe("UC-8.1.1 Reschedule Appointment", () => {
  let server;
  let baseUrl;
  let patientUser;
  let otherPatientUser;
  let doctor;
  let room;
  let appointmentId;
  let oldSlot;
  let newSlot;
  let blockedSlot;

  before(async () => {
    process.env.MONGODB_URI = "memory";
    await connectDatabase();
    server = await listen(createApp());
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  beforeEach(async () => {
    await AuthToken.deleteMany({});
    await mongoose.connection.collection("appointments").deleteMany({});
    await AppointmentSlot.deleteMany({});
    await ClinicRoom.deleteMany({});
    await Doctor.deleteMany({});
    await Patient.deleteMany({});
    await User.deleteMany({});

    patientUser = await User.create({
      email: "patient.reschedule@orcaxcare.com",
      passwordHash: "hash",
      role: "patient",
      fullName: "Reschedule Patient",
      isActive: true,
      isEmailVerified: true,
    });
    otherPatientUser = await User.create({
      email: "other.reschedule@orcaxcare.com",
      passwordHash: "hash",
      role: "patient",
      fullName: "Other Patient",
      isActive: true,
      isEmailVerified: true,
    });
    const doctorUser = await User.create({
      email: "doctor.reschedule@orcaxcare.com",
      passwordHash: "hash",
      role: "doctor",
      fullName: "Dr. Reschedule",
      isActive: true,
      isEmailVerified: true,
    });

    await Patient.create({ userId: patientUser._id, isActive: true });
    await Patient.create({ userId: otherPatientUser._id, isActive: true });
    doctor = await Doctor.create({
      userId: doctorUser._id,
      specialtyId: new mongoose.Types.ObjectId(),
      departmentId: new mongoose.Types.ObjectId(),
      licenseNo: "RS-001",
      isActive: true,
    });
    room = await ClinicRoom.create({
      name: "Room 301",
      roomCode: "RS301",
      roomNumber: "301",
      capacity: 1,
    });

    const slotBase = startOfToday();

    oldSlot = await createSlot({
      doctorId: doctor._id,
      roomId: room._id,
      date: formatDateOnly(addDays(slotBase, 1)),
      startTime: "09:00",
      endTime: "09:30",
      status: "booked",
    });
    newSlot = await createSlot({
      doctorId: doctor._id,
      roomId: room._id,
      date: formatDateOnly(addDays(slotBase, 2)),
      startTime: "10:00",
      endTime: "10:30",
      status: "available",
    });
    blockedSlot = await createSlot({
      doctorId: doctor._id,
      roomId: room._id,
      date: formatDateOnly(addDays(slotBase, 3)),
      startTime: "11:00",
      endTime: "11:30",
      status: "blocked",
    });

    appointmentId = new mongoose.Types.ObjectId();
    await mongoose.connection.collection("appointments").insertMany([
      {
        _id: appointmentId,
        patientUserId: patientUser._id,
        doctorId: doctor._id,
        slotId: oldSlot._id,
        status: "confirmed",
        reason: "Follow-up visit",
        fee: 200000,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new mongoose.Types.ObjectId(),
        patientUserId: otherPatientUser._id,
        doctorId: doctor._id,
        slotId: new mongoose.Types.ObjectId(),
        status: "confirmed",
        reason: "Private appointment",
        fee: 200000,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  });

  after(async () => {
    if (server) await close(server);
    await disconnectDatabase();
  });

  test("lists only authenticated patient appointments", async () => {
    const res = await fetch(`${baseUrl}/api/patient/appointments`, {
      headers: { Authorization: await authHeaderFor(patientUser) },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.items.length, 1);
    assert.equal(body.items[0].doctor.fullName, "Dr. Reschedule");
    assert.equal(body.items[0].status, "confirmed");
  });

  test("reschedules to an available slot and releases old slot after appointment update", async () => {
    const res = await fetch(`${baseUrl}/api/patient/appointments/${appointmentId}/reschedule`, {
      method: "PUT",
      headers: {
        Authorization: await authHeaderFor(patientUser),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ slotId: newSlot._id.toString() }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body._id, appointmentId.toString());
    assert.equal(body.slot._id, newSlot._id.toString());
    assert.equal(body.slot.status, "booked");

    const storedAppointment = await mongoose.connection
      .collection("appointments")
      .findOne({ _id: appointmentId });
    const storedOldSlot = await AppointmentSlot.findById(oldSlot._id).lean();
    const storedNewSlot = await AppointmentSlot.findById(newSlot._id).lean();

    assert.equal(storedAppointment.slotId.toString(), newSlot._id.toString());
    assert.equal(storedOldSlot.status, "available");
    assert.equal(storedNewSlot.status, "booked");
  });

  test("does not reschedule to a blocked slot", async () => {
    const res = await fetch(`${baseUrl}/api/patient/appointments/${appointmentId}/reschedule`, {
      method: "PUT",
      headers: {
        Authorization: await authHeaderFor(patientUser),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ slotId: blockedSlot._id.toString() }),
    });

    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.message, "Selected appointment slot is not available");

    const storedAppointment = await mongoose.connection
      .collection("appointments")
      .findOne({ _id: appointmentId });
    const storedOldSlot = await AppointmentSlot.findById(oldSlot._id).lean();
    const storedBlockedSlot = await AppointmentSlot.findById(blockedSlot._id).lean();

    assert.equal(storedAppointment.slotId.toString(), oldSlot._id.toString());
    assert.equal(storedOldSlot.status, "booked");
    assert.equal(storedBlockedSlot.status, "blocked");
  });
});
