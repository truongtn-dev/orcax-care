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
    email: "lineitem.patient@orcaxcare.com",
    passwordHash: "hash",
    role: "patient",
    fullName: "Line Item Patient",
    isActive: true,
    isEmailVerified: true,
  });
  await Patient.create({ userId: user._id, isActive: true });
  return user;
}

describe("Update Prescription Line Item", () => {
  let server;
  let baseUrl;
  let doctorUser;
  let doctor;
  let patientUser;
  let prescription;
  let medicine;

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
      email: "lineitem.doctor@orcaxcare.com",
      fullName: "Dr. Line Item",
      licenseNo: "LI-001",
    });
    doctorUser = ownDoctor.user;
    doctor = ownDoctor.doctor;
    patientUser = await createPatient();

    const room = await ClinicRoom.create({
      name: "Line Item Room",
      roomCode: "LI101",
      roomNumber: "LI-101",
      capacity: 1,
    });
    const slot = await AppointmentSlot.create({
      doctorId: doctor._id,
      roomId: room._id,
      workShiftId: new mongoose.Types.ObjectId(),
      date: new Date("2026-06-22T00:00:00.000Z"),
      startTime: "10:00",
      endTime: "10:30",
      status: "booked",
    });
    const appointment = await Appointment.create({
      patientUserId: patientUser._id,
      doctorId: doctor._id,
      slotId: slot._id,
      status: "completed",
      reason: "Line item visit",
      fee: 200000,
    });
    const encounter = await Encounter.create({
      patientUserId: patientUser._id,
      doctorId: doctor._id,
      appointmentId: appointment._id,
      visitDate: new Date("2026-06-22T10:00:00.000Z"),
      chiefComplaint: "Fever",
      diagnoses: [{ code: "R50.9", text: "Fever, unspecified" }],
      status: "draft",
    });

    medicine = await Medicine.create({
      code: "PARA500",
      name: "Paracetamol 500mg",
      unit: "tablet",
      price: 1000,
      stockQty: 50,
      minStockLevel: 5,
    });

    prescription = await Prescription.create({
      encounterId: encounter._id,
      patientUserId: patientUser._id,
      doctorId: doctor._id,
      createdBy: doctorUser._id,
      status: "draft",
      notes: "Draft Rx",
      lineItems: [
        {
          medicineId: medicine._id,
          medicineName: medicine.name,
          medicineCode: medicine.code,
          unit: medicine.unit,
          quantity: 5,
          durationDays: 3,
          dosage: "1 tablet twice daily",
          instructions: "After meals",
          unitPrice: 1000,
          lineTotal: 5000,
          stockSnapshot: 50,
          stockWarning: false,
        },
        {
          medicineId: new mongoose.Types.ObjectId(),
          medicineName: "Placeholder",
          medicineCode: "PH1",
          unit: "tablet",
          quantity: 2,
          durationDays: 2,
          dosage: "1 tablet daily",
          instructions: "",
          unitPrice: 500,
          lineTotal: 1000,
          stockSnapshot: 10,
          stockWarning: false,
        },
      ],
      totalAmount: 6000,
    });
  });

  after(async () => {
    if (server) await close(server);
    await disconnectDatabase();
  });

  test("updates quantity and recalculates line + prescription totals", async () => {
    const res = await fetch(
      `${baseUrl}/api/doctor/prescriptions/${prescription._id}/items/${medicine._id}`,
      {
        method: "PUT",
        headers: {
          Authorization: await authHeaderFor(doctorUser),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quantity: 10,
          durationDays: 5,
          dosage: "2 tablets twice daily",
          instructions: "With water",
        }),
      }
    );

    assert.equal(res.status, 200);
    const body = await res.json();
    const updated = body.lineItems.find((item) => item.medicineId === medicine._id.toString());
    assert.equal(updated.quantity, 10);
    assert.equal(updated.durationDays, 5);
    assert.equal(updated.dosage, "2 tablets twice daily");
    assert.equal(updated.instructions, "With water");
    assert.equal(updated.lineTotal, 10000);
    assert.equal(body.totalAmount, 11000);
  });

  test("rejects invalid quantity", async () => {
    const res = await fetch(
      `${baseUrl}/api/doctor/prescriptions/${prescription._id}/items/${medicine._id}`,
      {
        method: "PUT",
        headers: {
          Authorization: await authHeaderFor(doctorUser),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ quantity: 0 }),
      }
    );

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.message, "Quantity must be at least 1");
  });

  test("blocks updates when prescription is not draft", async () => {
    prescription.status = "issued";
    await prescription.save();

    const res = await fetch(
      `${baseUrl}/api/doctor/prescriptions/${prescription._id}/items/${medicine._id}`,
      {
        method: "PUT",
        headers: {
          Authorization: await authHeaderFor(doctorUser),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ quantity: 8 }),
      }
    );

    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.message, "Only draft prescriptions can be modified");
  });
});
