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

function dateAt(value) {
  return new Date(`${value}T08:00:00.000Z`);
}

async function createPatientUser(email, fullName) {
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

async function createDoctorProfile() {
  const user = await User.create({
    email: "timeline.doctor@orcaxcare.com",
    passwordHash: "hash",
    role: "doctor",
    fullName: "Dr. Timeline",
    isActive: true,
    isEmailVerified: true,
  });

  const doctor = await Doctor.create({
    userId: user._id,
    specialtyId: new mongoose.Types.ObjectId(),
    departmentId: new mongoose.Types.ObjectId(),
    licenseNo: "TL-001",
    isActive: true,
  });

  return { user, doctor };
}

async function createAppointmentFor({ patientUserId, doctorId, roomId, date, startTime }) {
  const slot = await AppointmentSlot.create({
    doctorId,
    roomId,
    workShiftId: new mongoose.Types.ObjectId(),
    date,
    startTime,
    endTime: "09:00",
    status: "booked",
  });

  return Appointment.create({
    patientUserId,
    doctorId,
    slotId: slot._id,
    status: "completed",
    reason: "Follow-up",
    fee: 200000,
  });
}

describe("UC-21 Patient EMR Timeline", () => {
  let server;
  let baseUrl;
  let patientUser;
  let otherPatientUser;
  let doctor;
  let room;

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

    patientUser = await createPatientUser("timeline.patient@orcaxcare.com", "Timeline Patient");
    otherPatientUser = await createPatientUser(
      "timeline.other@orcaxcare.com",
      "Other Timeline Patient"
    );
    doctor = (await createDoctorProfile()).doctor;
    room = await ClinicRoom.create({
      name: "Timeline Room",
      roomCode: "TL101",
      roomNumber: "101",
      capacity: 1,
    });

    const oldAppointment = await createAppointmentFor({
      patientUserId: patientUser._id,
      doctorId: doctor._id,
      roomId: room._id,
      date: dateAt("2026-06-01"),
      startTime: "08:00",
    });
    const newAppointment = await createAppointmentFor({
      patientUserId: patientUser._id,
      doctorId: doctor._id,
      roomId: room._id,
      date: dateAt("2026-06-12"),
      startTime: "10:00",
    });
    const otherAppointment = await createAppointmentFor({
      patientUserId: otherPatientUser._id,
      doctorId: doctor._id,
      roomId: room._id,
      date: dateAt("2026-06-12"),
      startTime: "11:00",
    });

    await Encounter.create([
      {
        patientUserId: patientUser._id,
        doctorId: doctor._id,
        appointmentId: oldAppointment._id,
        visitDate: dateAt("2026-06-01"),
        chiefComplaint: "Old headache",
        clinicalNotes: "Improved after rest",
        diagnoses: [{ code: "R51", text: "Headache" }],
        vitals: { temperatureC: 37.1, bloodPressure: "120/80" },
      },
      {
        patientUserId: patientUser._id,
        doctorId: doctor._id,
        appointmentId: newAppointment._id,
        visitDate: dateAt("2026-06-12"),
        chiefComplaint: "Follow-up cough",
        clinicalNotes: "Dry cough for two days",
        diagnoses: [{ code: "R05", text: "Cough" }],
        vitals: { temperatureC: 37.8, bloodPressure: "118/76" },
      },
      {
        patientUserId: otherPatientUser._id,
        doctorId: doctor._id,
        appointmentId: otherAppointment._id,
        visitDate: dateAt("2026-06-12"),
        chiefComplaint: "Private other patient",
      },
    ]);
  });

  after(async () => {
    if (server) await close(server);
    await disconnectDatabase();
  });

  test("lists only the authenticated patient's encounters in reverse chronological order", async () => {
    const res = await fetch(`${baseUrl}/api/patient/emr/timeline`, {
      headers: { Authorization: await authHeaderFor(patientUser) },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.total, 2);
    assert.deepEqual(
      body.items.map((item) => item.chiefComplaint),
      ["Follow-up cough", "Old headache"]
    );
    assert.equal(body.items[0].doctor.fullName, "Dr. Timeline");
    assert.equal(body.items[0].diagnoses[0].code, "R05");
    assert.equal(body.items[0].appointment.roomName, "Timeline Room");
    assert.equal(body.items[0].vitals.temperatureC, 37.8);
  });

  test("filters the timeline by visit date range", async () => {
    const res = await fetch(`${baseUrl}/api/patient/emr/timeline?from=2026-06-10&to=2026-06-15`, {
      headers: { Authorization: await authHeaderFor(patientUser) },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.total, 1);
    assert.equal(body.items[0].chiefComplaint, "Follow-up cough");
  });
});
