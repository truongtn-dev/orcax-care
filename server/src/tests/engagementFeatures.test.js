import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, beforeEach, describe, test } from "node:test";
import http from "node:http";
import mongoose from "mongoose";
import path from "node:path";
import { createApp } from "../app.js";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { Appointment } from "../models/Appointment.js";
import { Branch } from "../models/Branch.js";
import { Complaint } from "../models/Complaint.js";
import { Doctor } from "../models/Doctor.js";
import { Medicine } from "../models/Medicine.js";
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

describe("Engagement, pharmacy, and branch features", () => {
  let server;
  let baseUrl;
  let adminUser;
  let staffUser;
  let patientUser;
  let doctor;
  let medicine;
  let branch;
  let complaint;
  let adminAuth;
  let staffAuth;

  before(async () => {
    await connectDatabase();
    server = await listen(createApp());
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    await close(server);
    await disconnectDatabase();
  });

  beforeEach(async () => {
    await Promise.all([
      Complaint.deleteMany({}),
      Branch.deleteMany({}),
      Medicine.deleteMany({}),
      Appointment.deleteMany({}),
      Doctor.deleteMany({}),
      User.deleteMany({}),
    ]);

    adminUser = await User.create({
      email: "admin.engagement@test.com",
      passwordHash: "hash",
      role: "admin",
      fullName: "Admin Engagement",
      isActive: true,
      isEmailVerified: true,
    });

    staffUser = await User.create({
      email: "staff.engagement@test.com",
      passwordHash: "hash",
      role: "staff",
      fullName: "Staff Engagement",
      isActive: true,
      isEmailVerified: true,
    });

    patientUser = await User.create({
      email: "patient.engagement@test.com",
      passwordHash: "hash",
      role: "patient",
      fullName: "Patient Engagement",
      isActive: true,
      isEmailVerified: true,
    });

    doctor = await Doctor.create({
      userId: new mongoose.Types.ObjectId(),
      specialtyId: new mongoose.Types.ObjectId(),
      departmentId: new mongoose.Types.ObjectId(),
      licenseNo: "LIC-ENG-001",
      ratingAverage: 4.5,
      ratingCount: 1,
      isActive: true,
    });

    await Appointment.create({
      patientUserId: patientUser._id,
      doctorId: doctor._id,
      slotId: new mongoose.Types.ObjectId(),
      status: "completed",
      fee: 200000,
      rating: 5,
      reviewComment: "Excellent consultation.",
      reviewedAt: new Date(),
    });

    medicine = await Medicine.create({
      name: "Paracetamol 500mg",
      code: "PCM500",
      unit: "tablet",
      price: 1000,
      stockQty: 20,
      minStockLevel: 10,
      isActive: true,
    });

    branch = await Branch.create({
      name: "Test Branch",
      slug: "test-branch",
      address: "1 Test Street",
      phone: "028-0000-0000",
      workingHours: "Mon–Fri 8:00–17:00",
      lat: 10.77,
      lng: 106.7,
      isActive: true,
    });

    complaint = await Complaint.create({
      patientUserId: patientUser._id,
      subject: "Billing issue",
      content: "Invoice amount was incorrect.",
      status: "open",
    });

    adminAuth = await authHeaderFor(adminUser);
    staffAuth = await authHeaderFor(staffUser);
  });

  test("lists doctor reviews newest first", async () => {
    const res = await fetch(`${baseUrl}/api/public/doctors/${doctor._id}/reviews`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.items.length, 1);
    assert.equal(body.items[0].rating, 5);
  });

  test("records stock outbound and rejects over on-hand quantity", async () => {
    const okRes = await fetch(`${baseUrl}/api/staff/pharmacy/stock-outbound`, {
      method: "POST",
      headers: { Authorization: staffAuth, "Content-Type": "application/json" },
      body: JSON.stringify({
        medicineId: medicine._id.toString(),
        quantity: 5,
        reason: "Damaged packaging",
      }),
    });
    assert.equal(okRes.status, 201);

    const failRes = await fetch(`${baseUrl}/api/staff/pharmacy/stock-outbound`, {
      method: "POST",
      headers: { Authorization: staffAuth, "Content-Type": "application/json" },
      body: JSON.stringify({
        medicineId: medicine._id.toString(),
        quantity: 999,
        reason: "Should fail",
      }),
    });
    assert.equal(failRes.status, 409);

    const updated = await Medicine.findById(medicine._id).lean();
    assert.equal(updated.stockQty, 15);
  });

  test("lists medicines with low stock filter", async () => {
    await Medicine.updateOne({ _id: medicine._id }, { stockQty: 5 });
    const res = await fetch(`${baseUrl}/api/staff/pharmacy/medicines?lowStockOnly=true`, {
      headers: { Authorization: staffAuth },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.items.some((item) => item.code === "PCM500"));
  });

  test("returns admin complaint detail and updates status", async () => {
    const detailRes = await fetch(`${baseUrl}/api/admin/complaints/${complaint._id}`, {
      headers: { Authorization: adminAuth },
    });
    assert.equal(detailRes.status, 200);
    const detailBody = await detailRes.json();
    assert.equal(detailBody.complaint.subject, "Billing issue");

    const patchRes = await fetch(`${baseUrl}/api/admin/complaints/${complaint._id}/status`, {
      method: "PATCH",
      headers: { Authorization: adminAuth, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "in_progress" }),
    });
    assert.equal(patchRes.status, 200);
    const patchBody = await patchRes.json();
    assert.equal(patchBody.complaint.status, "in_progress");
  });

  test("lists branches publicly", async () => {
    const res = await fetch(`${baseUrl}/api/public/branches`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.items.length, 1);
    assert.equal(body.items[0].name, "Test Branch");
    assert.equal(body.items[0].slug, "test-branch");

    const detailRes = await fetch(`${baseUrl}/api/public/branches/${branch.slug}`);
    assert.equal(detailRes.status, 200);
    const detailBody = await detailRes.json();
    assert.equal(detailBody.branch.slug, "test-branch");
  });
});
