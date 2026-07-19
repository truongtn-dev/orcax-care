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
import { Icd10Catalog } from "../models/Icd10Catalog.js";
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
    email: "diagnosis.patient@orcaxcare.com",
    passwordHash: "hash",
    role: "patient",
    fullName: "Diagnosis Patient",
    isActive: true,
    isEmailVerified: true,
  });
  await Patient.create({ userId: user._id, isActive: true });
  return user;
}

async function createAppointment({ patientUserId, doctorId }) {
  const room = await ClinicRoom.create({
    name: "Diagnosis Room",
    roomCode: "DI101",
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

describe("Encounter Diagnosis Management Features", () => {
  let server;
  let baseUrl;
  let doctorUser;
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
    await Icd10Catalog.deleteMany({});

    const ownDoctor = await createDoctor({
      email: "diagnosis.doctor@orcaxcare.com",
      fullName: "Dr. Diagnosis",
      licenseNo: "DI-001",
    });
    doctorUser = ownDoctor.user;
    doctor = ownDoctor.doctor;
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
      chiefComplaint: "Headache",
      clinicalNotes: "Patient has mild headache",
      diagnoses: [],
      vitals: { temperatureC: 37.0, bloodPressure: "120/80" },
    });
  });

  after(async () => {
    if (server) await close(server);
    await disconnectDatabase();
  });

  test("can search ICD-10 catalog", async () => {
    const res = await fetch(`${baseUrl}/api/doctor/icd10?q=Cough`, {
      headers: { Authorization: await authHeaderFor(doctorUser) },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.items));
    assert.ok(body.items.length > 0);
    const item = body.items.find((i) => i.code === "R05");
    assert.equal(item.name, "Cough");
  });

  test("can add diagnosis to an encounter", async () => {
    const res = await fetch(`${baseUrl}/api/doctor/encounters/${encounter._id}/diagnoses`, {
      method: "POST",
      headers: {
        Authorization: await authHeaderFor(doctorUser),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code: "R05", note: "Primary cough" }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.diagnoses.length, 1);
    assert.equal(body.diagnoses[0].code, "R05");
    assert.equal(body.diagnoses[0].text, "Cough");
    assert.equal(body.diagnoses[0].note, "Primary cough");
  });

  test("duplicate diagnosis codes are blocked", async () => {
    await fetch(`${baseUrl}/api/doctor/encounters/${encounter._id}/diagnoses`, {
      method: "POST",
      headers: {
        Authorization: await authHeaderFor(doctorUser),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code: "R05", note: "First note" }),
    });

    const res = await fetch(`${baseUrl}/api/doctor/encounters/${encounter._id}/diagnoses`, {
      method: "POST",
      headers: {
        Authorization: await authHeaderFor(doctorUser),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code: "R05", note: "Duplicate note" }),
    });

    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.message, "ICD code R05 is already added to this encounter");
  });

  test("can remove diagnosis from encounter", async () => {
    await fetch(`${baseUrl}/api/doctor/encounters/${encounter._id}/diagnoses`, {
      method: "POST",
      headers: {
        Authorization: await authHeaderFor(doctorUser),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code: "R05" }),
    });

    const res = await fetch(`${baseUrl}/api/doctor/encounters/${encounter._id}/diagnoses/R05`, {
      method: "DELETE",
      headers: { Authorization: await authHeaderFor(doctorUser) },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.diagnoses.length, 0);
  });

  test("can update diagnosis note and code", async () => {
    await fetch(`${baseUrl}/api/doctor/encounters/${encounter._id}/diagnoses`, {
      method: "POST",
      headers: {
        Authorization: await authHeaderFor(doctorUser),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code: "R05", note: "Initial" }),
    });

    const res = await fetch(`${baseUrl}/api/doctor/encounters/${encounter._id}/diagnoses/R05`, {
      method: "PUT",
      headers: {
        Authorization: await authHeaderFor(doctorUser),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code: "R51", note: "Updated headache" }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.diagnoses.length, 1);
    assert.equal(body.diagnoses[0].code, "R51");
    assert.equal(body.diagnoses[0].text, "Headache");
    assert.equal(body.diagnoses[0].note, "Updated headache");
  });

  test("cannot update diagnosis on signed encounter", async () => {
    await fetch(`${baseUrl}/api/doctor/encounters/${encounter._id}/diagnoses`, {
      method: "POST",
      headers: {
        Authorization: await authHeaderFor(doctorUser),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code: "R05", note: "Primary" }),
    });

    await fetch(`${baseUrl}/api/doctor/encounters/${encounter._id}/sign-off`, {
      method: "POST",
      headers: { Authorization: await authHeaderFor(doctorUser) },
    });

    const res = await fetch(`${baseUrl}/api/doctor/encounters/${encounter._id}/diagnoses/R05`, {
      method: "PUT",
      headers: {
        Authorization: await authHeaderFor(doctorUser),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ note: "Should fail" }),
    });

    assert.equal(res.status, 409);
  });

  test("cannot sign off encounter with zero diagnoses", async () => {
    const res = await fetch(`${baseUrl}/api/doctor/encounters/${encounter._id}/sign-off`, {
      method: "POST",
      headers: { Authorization: await authHeaderFor(doctorUser) },
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.message, "At least one diagnosis is required before sign-off");
  });

  test("can sign off encounter once a diagnosis is added", async () => {
    await fetch(`${baseUrl}/api/doctor/encounters/${encounter._id}/diagnoses`, {
      method: "POST",
      headers: {
        Authorization: await authHeaderFor(doctorUser),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code: "R05" }),
    });

    const res = await fetch(`${baseUrl}/api/doctor/encounters/${encounter._id}/sign-off`, {
      method: "POST",
      headers: { Authorization: await authHeaderFor(doctorUser) },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, "signed");
  });
});
