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
import { Medicine } from "../models/Medicine.js";
import { Patient } from "../models/Patient.js";
import { Prescription } from "../models/Prescription.js";
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

async function createEncounter({ patientUserId, doctorId, startTime = "15:00", endTime = "15:30" }) {
  let room = await ClinicRoom.findOne({ roomCode: "RX101" });
  if (!room) {
    room = await ClinicRoom.create({
      name: "Prescription Room",
      roomCode: "RX101",
      roomNumber: "RX-101",
      capacity: 1,
    });
  }
  const slot = await AppointmentSlot.create({
    doctorId,
    roomId: room._id,
    workShiftId: new mongoose.Types.ObjectId(),
    date: new Date("2026-06-22T00:00:00.000Z"),
    startTime,
    endTime,
    status: "booked",
  });
  const appointment = await Appointment.create({
    patientUserId,
    doctorId,
    slotId: slot._id,
    status: "completed",
    reason: "Prescription visit",
    fee: 200000,
  });
  return Encounter.create({
    patientUserId,
    doctorId,
    appointmentId: appointment._id,
    visitDate: new Date(`2026-06-22T${startTime}:00.000Z`),
    chiefComplaint: "Medication needed",
    clinicalNotes: "Create prescription",
    diagnoses: [{ code: "J00", text: "Acute nasopharyngitis" }],
    status: "draft",
  });
}

describe("My Prescriptions API", () => {
  let server;
  let baseUrl;
  let doctorAUser, doctorADoc;
  let doctorBUser, doctorBDoc;
  let patientAlice, patientBob;
  let prescriptionA1, prescriptionA2, prescriptionB1;

  before(async () => {
    process.env.MONGODB_URI = "memory";
    await connectDatabase();
    server = await listen(createApp());
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  beforeEach(async () => {
    await AuthToken.deleteMany({});
    await Prescription.deleteMany({});
    await Medicine.deleteMany({});
    await Encounter.deleteMany({});
    await Appointment.deleteMany({});
    await AppointmentSlot.deleteMany({});
    await ClinicRoom.deleteMany({});
    await Doctor.deleteMany({});
    await Patient.deleteMany({});
    await User.deleteMany({});

    const docA = await createDoctor({
      email: "doc.a@orcaxcare.com",
      fullName: "Doctor Alice",
      licenseNo: "DOC-AAA",
    });
    doctorAUser = docA.user;
    doctorADoc = docA.doctor;

    const docB = await createDoctor({
      email: "doc.b@orcaxcare.com",
      fullName: "Doctor Bob",
      licenseNo: "DOC-BBB",
    });
    doctorBUser = docB.user;
    doctorBDoc = docB.doctor;

    patientAlice = await createPatient({ email: "alice.pat@gmail.com", fullName: "Alice Patient" });
    patientBob = await createPatient({ email: "bob.pat@gmail.com", fullName: "Bob Patient" });

    const encounterA1 = await createEncounter({ patientUserId: patientAlice._id, doctorId: doctorADoc._id, startTime: "15:00", endTime: "15:30" });
    const encounterA2 = await createEncounter({ patientUserId: patientBob._id, doctorId: doctorADoc._id, startTime: "16:00", endTime: "16:30" });
    const encounterB1 = await createEncounter({ patientUserId: patientAlice._id, doctorId: doctorBDoc._id, startTime: "15:00", endTime: "15:30" });

    prescriptionA1 = await Prescription.create({
      encounterId: encounterA1._id,
      patientUserId: patientAlice._id,
      doctorId: doctorADoc._id,
      status: "draft",
      notes: "First prescription",
      lineItems: [
        {
          medicineId: new mongoose.Types.ObjectId(),
          medicineName: "Paracetamol",
          medicineCode: "PARA",
          unit: "tablet",
          quantity: 10,
          durationDays: 5,
          dosage: "1 tab BID",
          unitPrice: 1000,
          lineTotal: 10000,
        },
      ],
      totalAmount: 10000,
      createdBy: doctorAUser._id,
    });

    prescriptionA2 = await Prescription.create({
      encounterId: encounterA2._id,
      patientUserId: patientBob._id,
      doctorId: doctorADoc._id,
      status: "dispensed",
      notes: "Second prescription",
      lineItems: [],
      totalAmount: 0,
      createdBy: doctorAUser._id,
    });

    prescriptionB1 = await Prescription.create({
      encounterId: encounterB1._id,
      patientUserId: patientAlice._id,
      doctorId: doctorBDoc._id,
      status: "draft",
      notes: "Other doctor prescription",
      lineItems: [],
      totalAmount: 0,
      createdBy: doctorBUser._id,
    });
  });

  after(async () => {
    if (server) await close(server);
    await disconnectDatabase();
  });

  test("Doctor A can list their own prescriptions and see total medication count", async () => {
    const res = await fetch(`${baseUrl}/api/doctor/prescriptions`, {
      headers: { Authorization: await authHeaderFor(doctorAUser) },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.total, 2);
    assert.equal(data.items.length, 2);
    const names = data.items.map((i) => i.patientName);
    assert.ok(names.includes("Alice Patient"));
    assert.ok(names.includes("Bob Patient"));
    const medicationCounts = data.items.map((i) => i.totalMedications);
    assert.ok(medicationCounts.includes(1));
    assert.ok(medicationCounts.includes(0));
  });

  test("Keyword search filters list by patient name case-insensitively", async () => {
    const res = await fetch(`${baseUrl}/api/doctor/prescriptions?keyword=bob`, {
      headers: { Authorization: await authHeaderFor(doctorAUser) },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.total, 1);
    assert.equal(data.items[0].patientName, "Bob Patient");
  });

  test("Prescription status filter works", async () => {
    const res = await fetch(`${baseUrl}/api/doctor/prescriptions?status=dispensed`, {
      headers: { Authorization: await authHeaderFor(doctorAUser) },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.total, 1);
    assert.equal(data.items[0].status, "dispensed");
  });

  test("Sorting works: oldest first vs newest first", async () => {
    const resNewest = await fetch(`${baseUrl}/api/doctor/prescriptions?sort=newest`, {
      headers: { Authorization: await authHeaderFor(doctorAUser) },
    });
    const dataNewest = await resNewest.json();
    assert.equal(dataNewest.items[0]._id, prescriptionA2._id.toString());

    const resOldest = await fetch(`${baseUrl}/api/doctor/prescriptions?sort=oldest`, {
      headers: { Authorization: await authHeaderFor(doctorAUser) },
    });
    const dataOldest = await resOldest.json();
    assert.equal(dataOldest.items[0]._id, prescriptionA1._id.toString());
  });

  test("Doctor A can view details of their own prescription", async () => {
    const res = await fetch(`${baseUrl}/api/doctor/prescriptions/${prescriptionA1._id}`, {
      headers: { Authorization: await authHeaderFor(doctorAUser) },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data._id, prescriptionA1._id.toString());
    assert.equal(data.notes, "First prescription");
    assert.equal(data.lineItems.length, 1);
    assert.equal(data.lineItems[0].medicineName, "Paracetamol");
  });

  test("Doctor A cannot access Doctor B's prescriptions", async () => {
    const res = await fetch(`${baseUrl}/api/doctor/prescriptions/${prescriptionB1._id}`, {
      headers: { Authorization: await authHeaderFor(doctorAUser) },
    });
    assert.equal(res.status, 404);
  });

  test("Returns 404 for non-existent prescription ID", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await fetch(`${baseUrl}/api/doctor/prescriptions/${fakeId}`, {
      headers: { Authorization: await authHeaderFor(doctorAUser) },
    });
    assert.equal(res.status, 404);
  });
});
