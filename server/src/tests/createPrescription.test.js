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

async function createPatient() {
  const user = await User.create({
    email: "rx.patient@orcaxcare.com",
    passwordHash: "hash",
    role: "patient",
    fullName: "Prescription Patient",
    isActive: true,
    isEmailVerified: true,
  });
  await Patient.create({ userId: user._id, isActive: true });
  return user;
}

async function createEncounter({ patientUserId, doctorId, status = "draft" }) {
  const room = await ClinicRoom.create({
    name: "Prescription Room",
    roomCode: "RX101",
    roomNumber: "RX-101",
    capacity: 1,
  });
  const slot = await AppointmentSlot.create({
    doctorId,
    roomId: room._id,
    workShiftId: new mongoose.Types.ObjectId(),
    date: new Date("2026-06-22T00:00:00.000Z"),
    startTime: "15:00",
    endTime: "15:30",
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
    visitDate: new Date("2026-06-22T15:00:00.000Z"),
    chiefComplaint: "Medication needed",
    clinicalNotes: "Create prescription after diagnosis",
    diagnoses: [{ code: "J00", text: "Acute nasopharyngitis" }],
    status,
    signedOffAt: status === "signed" ? new Date("2026-06-22T16:00:00.000Z") : null,
  });
}

describe("UC-24 Create Prescription", () => {
  let server;
  let baseUrl;
  let doctorUser;
  let otherDoctorUser;
  let doctor;
  let patientUser;
  let encounter;
  let paracetamol;
  let amoxicillin;

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

    const ownDoctor = await createDoctor({
      email: "rx.doctor@orcaxcare.com",
      fullName: "Dr. Prescription",
      licenseNo: "RX-001",
    });
    doctorUser = ownDoctor.user;
    doctor = ownDoctor.doctor;
    otherDoctorUser = (
      await createDoctor({
        email: "rx.other@orcaxcare.com",
        fullName: "Dr. Other Prescription",
        licenseNo: "RX-002",
      })
    ).user;
    patientUser = await createPatient();
    encounter = await createEncounter({ patientUserId: patientUser._id, doctorId: doctor._id });

    paracetamol = await Medicine.create({
      code: "PARA500",
      name: "Paracetamol 500mg",
      unit: "tablet",
      price: 1200,
      stockQty: 20,
      minStockLevel: 5,
    });
    amoxicillin = await Medicine.create({
      code: "AMOX500",
      name: "Amoxicillin 500mg",
      unit: "capsule",
      price: 2500,
      stockQty: 3,
      minStockLevel: 5,
    });
  });

  after(async () => {
    if (server) await close(server);
    await disconnectDatabase();
  });

  test("doctor creates prescription with line item totals and stock warning", async () => {
    const res = await fetch(`${baseUrl}/api/doctor/encounters/${encounter._id}/prescriptions`, {
      method: "POST",
      headers: {
        Authorization: await authHeaderFor(doctorUser),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        notes: "Take after meals",
        lineItems: [
          {
            medicineId: paracetamol._id.toString(),
            quantity: 10,
            durationDays: 5,
            dosage: "1 tablet twice daily",
            instructions: "After meals",
          },
          {
            medicineId: amoxicillin._id.toString(),
            quantity: 8,
            durationDays: 4,
            dosage: "1 capsule twice daily",
            instructions: "After meals",
          },
        ],
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.encounterId, encounter._id.toString());
    assert.equal(body.patientUserId, patientUser._id.toString());
    assert.equal(body.doctorId, doctor._id.toString());
    assert.equal(body.status, "draft");
    assert.equal(body.totalAmount, 32000);
    assert.equal(body.lineItems.length, 2);
    assert.equal(body.lineItems[0].lineTotal, 12000);
    assert.equal(body.lineItems[0].stockWarning, false);
    assert.equal(body.lineItems[1].lineTotal, 20000);
    assert.equal(body.lineItems[1].stockWarning, true);
    assert.equal(body.lineItems[1].stockSnapshot, 3);

    const stored = await Prescription.findById(body._id).lean();
    assert.equal(stored.totalAmount, 32000);
    assert.equal(stored.lineItems[1].stockWarning, true);
    assert.equal(await Medicine.findById(amoxicillin._id).then((row) => row.stockQty), 3);
  });

  test("another doctor cannot create prescription for the encounter", async () => {
    const res = await fetch(`${baseUrl}/api/doctor/encounters/${encounter._id}/prescriptions`, {
      method: "POST",
      headers: {
        Authorization: await authHeaderFor(otherDoctorUser),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        lineItems: [{ medicineId: paracetamol._id.toString(), quantity: 1, durationDays: 1 }],
      }),
    });

    assert.equal(res.status, 404);
    assert.equal(await Prescription.countDocuments(), 0);
  });

  test("signed encounter cannot receive a new prescription", async () => {
    encounter.status = "signed";
    encounter.signedOffAt = new Date();
    encounter.signedOffBy = doctorUser._id;
    await encounter.save();

    const res = await fetch(`${baseUrl}/api/doctor/encounters/${encounter._id}/prescriptions`, {
      method: "POST",
      headers: {
        Authorization: await authHeaderFor(doctorUser),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        lineItems: [{ medicineId: paracetamol._id.toString(), quantity: 1, durationDays: 1 }],
      }),
    });

    assert.equal(res.status, 409);
    assert.deepEqual(await res.json(), { message: "Encounter is signed off" });
  });
});
