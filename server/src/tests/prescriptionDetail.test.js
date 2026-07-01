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

async function createEncounter({ patientUserId, doctorId }) {
  const room = await ClinicRoom.create({
    name: "Prescription Detail Room",
    roomCode: "RXD101",
    roomNumber: "RXD-101",
    capacity: 1,
  });
  const slot = await AppointmentSlot.create({
    doctorId,
    roomId: room._id,
    workShiftId: new mongoose.Types.ObjectId(),
    date: new Date("2026-06-23T00:00:00.000Z"),
    startTime: "16:00",
    endTime: "16:30",
    status: "booked",
  });
  const appointment = await Appointment.create({
    patientUserId,
    doctorId,
    slotId: slot._id,
    status: "completed",
    reason: "Prescription detail visit",
    fee: 200000,
  });
  return Encounter.create({
    patientUserId,
    doctorId,
    appointmentId: appointment._id,
    visitDate: new Date("2026-06-23T16:00:00.000Z"),
    chiefComplaint: "Prescription detail check",
    clinicalNotes: "Prescription created for read-only detail.",
    diagnoses: [{ code: "J00", text: "Acute nasopharyngitis" }],
  });
}

describe("UC-24.5 Prescription Detail", () => {
  let server;
  let baseUrl;
  let doctorUser;
  let otherDoctorUser;
  let doctor;
  let patientUser;
  let otherPatientUser;
  let encounter;
  let prescription;

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
      email: "detail.doctor@orcaxcare.com",
      fullName: "Dr. Detail",
      licenseNo: "RXD-001",
    });
    doctorUser = ownDoctor.user;
    doctor = ownDoctor.doctor;
    otherDoctorUser = (
      await createDoctor({
        email: "detail.other.doctor@orcaxcare.com",
        fullName: "Dr. Other Detail",
        licenseNo: "RXD-002",
      })
    ).user;
    patientUser = await createPatient({
      email: "detail.patient@orcaxcare.com",
      fullName: "Detail Patient",
    });
    otherPatientUser = await createPatient({
      email: "detail.other.patient@orcaxcare.com",
      fullName: "Other Detail Patient",
    });
    encounter = await createEncounter({ patientUserId: patientUser._id, doctorId: doctor._id });
    const medicine = await Medicine.create({
      code: "PARA500",
      name: "Paracetamol 500mg",
      unit: "tablet",
      price: 1200,
      stockQty: 20,
      minStockLevel: 5,
    });
    prescription = await Prescription.create({
      encounterId: encounter._id,
      patientUserId: patientUser._id,
      doctorId: doctor._id,
      status: "draft",
      notes: "Take after meals",
      createdBy: doctorUser._id,
      totalAmount: 12000,
      lineItems: [
        {
          medicineId: medicine._id,
          medicineName: medicine.name,
          medicineCode: medicine.code,
          unit: medicine.unit,
          quantity: 10,
          durationDays: 5,
          dosage: "1 tablet twice daily",
          instructions: "After meals",
          unitPrice: 1200,
          lineTotal: 12000,
          stockSnapshot: 20,
          stockWarning: false,
        },
      ],
    });
  });

  after(async () => {
    if (server) await close(server);
    await disconnectDatabase();
  });

  test("doctor reads prescription detail for own encounter", async () => {
    const res = await fetch(`${baseUrl}/api/doctor/prescriptions/${prescription._id}`, {
      headers: { Authorization: await authHeaderFor(doctorUser) },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body._id, prescription._id.toString());
    assert.equal(body.patient.fullName, "Detail Patient");
    assert.equal(body.doctor.fullName, "Dr. Detail");
    assert.equal(body.encounter.chiefComplaint, "Prescription detail check");
    assert.equal(body.lineItems[0].medicineName, "Paracetamol 500mg");
    assert.equal(body.totalAmount, 12000);
  });

  test("patient reads own prescription detail", async () => {
    const res = await fetch(`${baseUrl}/api/patient/prescriptions/${prescription._id}`, {
      headers: { Authorization: await authHeaderFor(patientUser) },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body._id, prescription._id.toString());
    assert.equal(body.patient.fullName, "Detail Patient");
    assert.equal(body.lineItems[0].dosage, "1 tablet twice daily");
  });

  test("other doctor and other patient cannot read prescription detail", async () => {
    const doctorRes = await fetch(`${baseUrl}/api/doctor/prescriptions/${prescription._id}`, {
      headers: { Authorization: await authHeaderFor(otherDoctorUser) },
    });
    assert.equal(doctorRes.status, 404);

    const patientRes = await fetch(`${baseUrl}/api/patient/prescriptions/${prescription._id}`, {
      headers: { Authorization: await authHeaderFor(otherPatientUser) },
    });
    assert.equal(patientRes.status, 404);
  });
});
