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
    email: "signoff.patient@orcaxcare.com",
    passwordHash: "hash",
    role: "patient",
    fullName: "Signoff Patient",
    isActive: true,
    isEmailVerified: true,
  });
  await Patient.create({ userId: user._id, isActive: true });
  return user;
}

async function createAppointment({ patientUserId, doctorId }) {
  const room = await ClinicRoom.create({
    name: "Signoff Room",
    roomCode: "SO101",
    roomNumber: "101",
    capacity: 1,
  });
  const slot = await AppointmentSlot.create({
    doctorId,
    roomId: room._id,
    workShiftId: new mongoose.Types.ObjectId(),
    date: new Date("2026-06-20T00:00:00.000Z"),
    startTime: "08:00",
    endTime: "08:30",
    status: "booked",
  });
  return Appointment.create({
    patientUserId,
    doctorId,
    slotId: slot._id,
    status: "completed",
    reason: "Clinical visit",
    fee: 200000,
  });
}

describe("UC-17.1.1.1.2 Sign Off Encounter", () => {
  let server;
  let baseUrl;
  let doctorUser;
  let otherDoctorUser;
  let doctor;
  let patientUser;
  let appointment;
  let encounter;

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
      email: "signoff.doctor@orcaxcare.com",
      fullName: "Dr. Signoff",
      licenseNo: "SO-001",
    });
    doctorUser = ownDoctor.user;
    doctor = ownDoctor.doctor;
    otherDoctorUser = (
      await createDoctor({
        email: "signoff.other@orcaxcare.com",
        fullName: "Dr. Other Signoff",
        licenseNo: "SO-002",
      })
    ).user;
    patientUser = await createPatient();
    appointment = await createAppointment({
      patientUserId: patientUser._id,
      doctorId: doctor._id,
    });
    encounter = await Encounter.create({
      patientUserId: patientUser._id,
      doctorId: doctor._id,
      appointmentId: appointment._id,
      visitDate: new Date("2026-06-20T08:00:00.000Z"),
      chiefComplaint: "Chest tightness follow-up",
      clinicalNotes: "Stable and ready for sign-off",
      diagnoses: [{ code: "R07", text: "Chest pain" }],
      vitals: { temperatureC: 36.9, bloodPressure: "118/78" },
    });
  });

  after(async () => {
    if (server) await close(server);
    await disconnectDatabase();
  });

  test("doctor opens own encounter detail before sign-off", async () => {
    const res = await fetch(`${baseUrl}/api/doctor/encounters/${encounter._id}`, {
      headers: { Authorization: await authHeaderFor(doctorUser) },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body._id, encounter._id.toString());
    assert.equal(body.status, "draft");
    assert.equal(body.patient.fullName, "Signoff Patient");
    assert.equal(body.diagnoses[0].code, "R07");
    assert.equal(body.canSignOff, true);
  });

  test("doctor appointment detail exposes linked encounter id", async () => {
    const res = await fetch(`${baseUrl}/api/doctor/appointments/${appointment._id}`, {
      headers: { Authorization: await authHeaderFor(doctorUser) },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body._id, appointment._id.toString());
    assert.equal(body.encounterId, encounter._id.toString());
  });

  test("doctor signs off own draft encounter and cannot sign it again", async () => {
    const signRes = await fetch(`${baseUrl}/api/doctor/encounters/${encounter._id}/sign-off`, {
      method: "POST",
      headers: { Authorization: await authHeaderFor(doctorUser) },
    });

    assert.equal(signRes.status, 200);
    const signed = await signRes.json();
    assert.equal(signed.status, "signed");
    assert.equal(signed.canSignOff, false);
    assert.ok(signed.signedOffAt);
    assert.equal(signed.signedOffBy.userId, doctorUser._id.toString());

    const stored = await Encounter.findById(encounter._id).lean();
    assert.equal(stored.status, "signed");
    assert.equal(stored.signedOffBy.toString(), doctorUser._id.toString());
    assert.ok(stored.signedOffAt instanceof Date);

    const repeatRes = await fetch(`${baseUrl}/api/doctor/encounters/${encounter._id}/sign-off`, {
      method: "POST",
      headers: { Authorization: await authHeaderFor(doctorUser) },
    });
    assert.equal(repeatRes.status, 409);
    assert.deepEqual(await repeatRes.json(), { message: "Encounter is already signed off" });
  });

  test("another doctor cannot open or sign the encounter", async () => {
    const detailRes = await fetch(`${baseUrl}/api/doctor/encounters/${encounter._id}`, {
      headers: { Authorization: await authHeaderFor(otherDoctorUser) },
    });
    assert.equal(detailRes.status, 404);

    const signRes = await fetch(`${baseUrl}/api/doctor/encounters/${encounter._id}/sign-off`, {
      method: "POST",
      headers: { Authorization: await authHeaderFor(otherDoctorUser) },
    });
    assert.equal(signRes.status, 404);
  });
});
