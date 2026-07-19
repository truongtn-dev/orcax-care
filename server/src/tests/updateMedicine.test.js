import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, beforeEach, describe, test } from "node:test";
import http from "node:http";
import mongoose from "mongoose";
import path from "node:path";
import { createApp } from "../app.js";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { AuthToken } from "../models/AuthToken.js";
import { Medicine } from "../models/Medicine.js";
import { User } from "../models/User.js";
import { Doctor } from "../models/Doctor.js";
import { Patient } from "../models/Patient.js";
import { Encounter } from "../models/Encounter.js";
import { Appointment } from "../models/Appointment.js";
import { AppointmentSlot } from "../models/AppointmentSlot.js";
import { ClinicRoom } from "../models/ClinicRoom.js";
import { Prescription } from "../models/Prescription.js";
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

describe("Update medicine (staff + admin)", () => {
  let server;
  let baseUrl;
  let adminUser;
  let staffUser;
  let doctorUser;
  let doctorDoc;
  let patientUser;
  let encounter;
  let activeMedicine;
  let secondMedicine;

  before(async () => {
    process.env.MONGODB_URI = "memory";
    await connectDatabase();
    server = await listen(createApp());
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  beforeEach(async () => {
    await AuthToken.deleteMany({});
    await Medicine.deleteMany({});
    await Prescription.deleteMany({});
    await Encounter.deleteMany({});
    await Appointment.deleteMany({});
    await AppointmentSlot.deleteMany({});
    await ClinicRoom.deleteMany({});
    await Doctor.deleteMany({});
    await Patient.deleteMany({});
    await User.deleteMany({});

    adminUser = await User.create({
      email: "admin.med@orcaxcare.com",
      passwordHash: "hash",
      role: "admin",
      fullName: "System Admin",
      isActive: true,
      isEmailVerified: true,
    });

    staffUser = await User.create({
      email: "staff.med@orcaxcare.com",
      passwordHash: "hash",
      role: "staff",
      fullName: "Pharmacy Staff",
      isActive: true,
      isEmailVerified: true,
    });

    doctorUser = await User.create({
      email: "doctor.med@orcaxcare.com",
      passwordHash: "hash",
      role: "doctor",
      fullName: "Dr. Med",
      isActive: true,
      isEmailVerified: true,
    });
    doctorDoc = await Doctor.create({
      userId: doctorUser._id,
      specialtyId: new mongoose.Types.ObjectId(),
      departmentId: new mongoose.Types.ObjectId(),
      licenseNo: "LIC-MED-123",
      isActive: true,
    });

    patientUser = await User.create({
      email: "patient.med@orcaxcare.com",
      passwordHash: "hash",
      role: "patient",
      fullName: "Patient Med",
      isActive: true,
      isEmailVerified: true,
    });
    await Patient.create({ userId: patientUser._id, isActive: true });

    const room = await ClinicRoom.create({
      name: "Med Consultation Room",
      roomCode: "MCR101",
      roomNumber: "MCR-101",
      capacity: 1,
    });
    const slot = await AppointmentSlot.create({
      doctorId: doctorDoc._id,
      roomId: room._id,
      workShiftId: new mongoose.Types.ObjectId(),
      date: new Date("2026-06-25T00:00:00.000Z"),
      startTime: "11:00",
      endTime: "11:30",
      status: "booked",
    });
    const appointment = await Appointment.create({
      patientUserId: patientUser._id,
      doctorId: doctorDoc._id,
      slotId: slot._id,
      status: "completed",
      reason: "Routine Check",
      fee: 150000,
    });
    encounter = await Encounter.create({
      patientUserId: patientUser._id,
      doctorId: doctorDoc._id,
      appointmentId: appointment._id,
      visitDate: new Date("2026-06-25T11:00:00.000Z"),
      status: "draft",
      diagnoses: [{ code: "J00", text: "Common cold" }],
    });

    activeMedicine = await Medicine.create({
      code: "AMOX500",
      name: "Amoxicillin 500mg",
      unit: "capsule",
      price: 5000,
      stockQty: 100,
      minStockLevel: 20,
      isActive: true,
    });

    secondMedicine = await Medicine.create({
      code: "PARA500",
      name: "Paracetamol 500mg",
      unit: "tablet",
      price: 1500,
      stockQty: 200,
      minStockLevel: 50,
      isActive: true,
    });
  });

  after(async () => {
    if (server) await close(server);
    await disconnectDatabase();
  });

  test("Admin updates medicine details successfully", async () => {
    const auth = await authHeaderFor(adminUser);
    const res = await fetch(`${baseUrl}/api/admin/medicines/${activeMedicine._id}`, {
      method: "PUT",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Amoxicillin Premium 500mg",
        unit: "cap",
        price: 5500,
        minStockLevel: 15,
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.name, "Amoxicillin Premium 500mg");
    assert.equal(body.unit, "cap");
    assert.equal(body.price, 5500);
    assert.equal(body.minStockLevel, 15);

    const stored = await Medicine.findById(activeMedicine._id);
    assert.equal(stored.name, "Amoxicillin Premium 500mg");
  });

  test("Staff updates medicine details successfully", async () => {
    const auth = await authHeaderFor(staffUser);
    const res = await fetch(`${baseUrl}/api/staff/pharmacy/medicines/${activeMedicine._id}`, {
      method: "PUT",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Amoxicillin Staff Edit",
        unit: "box",
        minStockLevel: 30,
        isActive: true,
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.name, "Amoxicillin Staff Edit");
    assert.equal(body.unit, "box");
    assert.equal(body.minStockLevel, 30);
  });

  test("Validation fails for empty name, empty unit, and negative threshold", async () => {
    const auth = await authHeaderFor(adminUser);

    const resName = await fetch(`${baseUrl}/api/admin/medicines/${activeMedicine._id}`, {
      method: "PUT",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "", unit: "capsule", minStockLevel: 10 }),
    });
    assert.equal(resName.status, 400);
    const bodyName = await resName.json();
    assert.equal(bodyName.message, "Medicine name is required");

    const resUnit = await fetch(`${baseUrl}/api/admin/medicines/${activeMedicine._id}`, {
      method: "PUT",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Amoxicillin", unit: "", minStockLevel: 10 }),
    });
    assert.equal(resUnit.status, 400);
    const bodyUnit = await resUnit.json();
    assert.equal(bodyUnit.message, "Unit is required");

    const resThresh = await fetch(`${baseUrl}/api/admin/medicines/${activeMedicine._id}`, {
      method: "PUT",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Amoxicillin", unit: "capsule", minStockLevel: -5 }),
    });
    assert.equal(resThresh.status, 400);
    const bodyThresh = await resThresh.json();
    assert.equal(bodyThresh.message, "Low stock threshold must be greater than or equal to 0");
  });

  test("Validation fails for duplicate medicine names", async () => {
    const auth = await authHeaderFor(adminUser);
    const res = await fetch(`${baseUrl}/api/admin/medicines/${activeMedicine._id}`, {
      method: "PUT",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Paracetamol 500mg",
        unit: "tablet",
        minStockLevel: 20,
      }),
    });

    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.message, "Medicine name already exists");
  });

  test("Deactivate medicine restricts prescribing and visibility in prescription search", async () => {
    const authStaff = await authHeaderFor(staffUser);
    const authDoc = await authHeaderFor(doctorUser);

    const resDeact = await fetch(`${baseUrl}/api/staff/pharmacy/medicines/${activeMedicine._id}`, {
      method: "PUT",
      headers: { Authorization: authStaff, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: activeMedicine.name,
        unit: activeMedicine.unit,
        minStockLevel: activeMedicine.minStockLevel,
        isActive: false,
      }),
    });
    assert.equal(resDeact.status, 200);

    const resSearch = await fetch(`${baseUrl}/api/doctor/medicines?q=Amoxicillin`, {
      headers: { Authorization: authDoc },
    });
    assert.equal(resSearch.status, 200);
    const searchBody = await resSearch.json();
    const found = searchBody.items.some((item) => item._id === activeMedicine._id.toString());
    assert.equal(found, false, "Deactivated medicine must not be returned in prescription search.");

    const resPrescribe = await fetch(`${baseUrl}/api/doctor/encounters/${encounter._id}/prescriptions`, {
      method: "POST",
      headers: { Authorization: authDoc, "Content-Type": "application/json" },
      body: JSON.stringify({
        lineItems: [
          {
            medicineId: activeMedicine._id.toString(),
            quantity: 10,
            durationDays: 5,
            dosage: "1 capsule BID",
          },
        ],
      }),
    });
    assert.equal(resPrescribe.status, 404); // service only matches isActive: true medicines
  });

  test("Deactivated medicine continues displaying correctly in old prescriptions", async () => {
    const authDoc = await authHeaderFor(doctorUser);
    const authStaff = await authHeaderFor(staffUser);

    const resPrescribe = await fetch(`${baseUrl}/api/doctor/encounters/${encounter._id}/prescriptions`, {
      method: "POST",
      headers: { Authorization: authDoc, "Content-Type": "application/json" },
      body: JSON.stringify({
        lineItems: [
          {
            medicineId: activeMedicine._id.toString(),
            quantity: 10,
            durationDays: 5,
            dosage: "1 capsule BID",
          },
        ],
      }),
    });
    assert.equal(resPrescribe.status, 201);
    const prescriptionBody = await resPrescribe.json();

    const resDeact = await fetch(`${baseUrl}/api/staff/pharmacy/medicines/${activeMedicine._id}`, {
      method: "PUT",
      headers: { Authorization: authStaff, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: activeMedicine.name,
        unit: activeMedicine.unit,
        minStockLevel: activeMedicine.minStockLevel,
        isActive: false,
      }),
    });
    assert.equal(resDeact.status, 200);

    const resDetail = await fetch(`${baseUrl}/api/doctor/prescriptions/${prescriptionBody._id}`, {
      headers: { Authorization: authDoc },
    });
    assert.equal(resDetail.status, 200);
    const body = await resDetail.json();
    assert.equal(body.lineItems.length, 1);
    assert.equal(body.lineItems[0].medicineName, "Amoxicillin 500mg");
    assert.equal(body.lineItems[0].medicineCode, "AMOX500");
  });
});
