import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, beforeEach, describe, test } from "node:test";
import http from "node:http";
import path from "node:path";
import { createApp } from "../app.js";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { AuthToken } from "../models/AuthToken.js";
import { Department } from "../models/Department.js";
import { Doctor } from "../models/Doctor.js";
import { Patient } from "../models/Patient.js";
import { Specialty } from "../models/Specialty.js";
import { User } from "../models/User.js";
import { issueAuthToken } from "../services/token.service.js";
import {
  normalizeEmail,
  validatePhoneOptional,
  validateRequired,
} from "../utils/validation.js";

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

describe("ThangDQ Iteration 1 foundations", () => {
  let server;
  let baseUrl;
  let admin;
  let patient;

  before(async () => {
    process.env.MONGODB_URI = "memory";
    await connectDatabase();
    server = await listen(createApp());
    const address = server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  beforeEach(async () => {
    await AuthToken.deleteMany({});
    await Doctor.deleteMany({});
    await Department.deleteMany({});
    await Specialty.deleteMany({});
    await Patient.deleteMany({});
    await User.deleteMany({});
    admin = await User.create({
      email: "admin.task1@orcaxcare.com",
      passwordHash: "hash",
      role: "admin",
      fullName: "Task One Admin",
      isActive: true,
      isEmailVerified: true,
      isLocked: false,
    });
    patient = await User.create({
      email: "patient.task1@orcaxcare.com",
      passwordHash: "hash",
      role: "patient",
      fullName: "Task One Patient",
      isActive: true,
      isEmailVerified: true,
      isLocked: false,
    });
    await Patient.create({ userId: patient._id });
  });

  after(async () => {
    if (server) await close(server);
    await disconnectDatabase();
  });

  test("normalizes shared validation inputs", () => {
    assert.equal(normalizeEmail("  ADMIN@OrcaXCare.COM  "), "admin@orcaxcare.com");
    assert.equal(validateRequired("  ", "Tên khoa/phòng ban"), "Tên khoa/phòng ban là bắt buộc");
    assert.equal(validateRequired("Cardiology", "Tên khoa/phòng ban"), null);
    assert.equal(validatePhoneOptional("028-1234-1001"), null);
    assert.equal(validatePhoneOptional("abc"), "Số điện thoại không hợp lệ");
  });

  test("protects admin routes with auth and admin role", async () => {
    const noToken = await fetch(`${baseUrl}/api/admin/ping`);
    assert.equal(noToken.status, 401);

    const patientRes = await fetch(`${baseUrl}/api/admin/ping`, {
      headers: { Authorization: await authHeaderFor(patient) },
    });
    assert.equal(patientRes.status, 403);

    const adminRes = await fetch(`${baseUrl}/api/admin/ping`, {
      headers: { Authorization: await authHeaderFor(admin) },
    });
    assert.equal(adminRes.status, 200);
    assert.deepEqual(await adminRes.json(), { ok: true, scope: "admin" });
  });

  test("keeps profile routes protected by authentication", async () => {
    const noToken = await fetch(`${baseUrl}/api/profile`);
    assert.equal(noToken.status, 401);

    const patientRes = await fetch(`${baseUrl}/api/profile`, {
      headers: { Authorization: await authHeaderFor(patient) },
    });
    assert.equal(patientRes.status, 200);
    const body = await patientRes.json();
    assert.equal(body.userId, patient._id.toString());
    assert.equal(body.email, "patient.task1@orcaxcare.com");
  });

  test("loads account detail with linked patient profile", async () => {
    const res = await fetch(`${baseUrl}/api/admin/accounts/${patient._id}`, {
      headers: { Authorization: await authHeaderFor(admin) },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body._id, patient._id.toString());
    assert.equal(body.email, "patient.task1@orcaxcare.com");
    assert.equal(body.role, "patient");
    assert.equal(body.fullName, "Task One Patient");
    assert.equal(body.phone, "");
    assert.equal(body.isActive, true);
    assert.equal(body.isLocked, false);
    assert.equal(body.isEmailVerified, true);
    assert.equal(typeof body.patientId, "string");
    assert.equal(body.doctorId, null);
  });

  test("updates account contact fields and normalizes email", async () => {
    const res = await fetch(`${baseUrl}/api/admin/accounts/${patient._id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: await authHeaderFor(admin),
      },
      body: JSON.stringify({
        email: "  New.Patient@OrcaXCare.COM  ",
        fullName: "Nguyen Van Moi",
        phone: "090 123 4567",
        isActive: false,
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.email, "new.patient@orcaxcare.com");
    assert.equal(body.fullName, "Nguyen Van Moi");
    assert.equal(body.phone, "090 123 4567");
    assert.equal(body.isActive, false);

    const saved = await User.findById(patient._id).lean();
    assert.equal(saved.email, "new.patient@orcaxcare.com");
    assert.equal(saved.fullName, "Nguyen Van Moi");
    assert.equal(saved.phone, "090 123 4567");
    assert.equal(saved.isActive, false);
  });

  test("rejects duplicate account email updates", async () => {
    const res = await fetch(`${baseUrl}/api/admin/accounts/${patient._id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: await authHeaderFor(admin),
      },
      body: JSON.stringify({
        email: admin.email,
        fullName: "Task One Patient",
        phone: "0900000000",
      }),
    });

    assert.equal(res.status, 409);
    assert.deepEqual(await res.json(), { message: "Email đã được sử dụng" });
  });

  test("lists specialties with active-only filtering", async () => {
    await Specialty.create([
      { code: "ORTH", name: "Orthopedics", isActive: true },
      { code: "CARD", name: "Cardiology", isActive: true },
      { code: "DERM", name: "Dermatology", isActive: false },
    ]);

    const activeRes = await fetch(`${baseUrl}/api/admin/specialties`, {
      headers: { Authorization: await authHeaderFor(admin) },
    });

    assert.equal(activeRes.status, 200);
    const activeBody = await activeRes.json();
    assert.deepEqual(
      activeBody.items.map((item) => item.name),
      ["Cardiology", "Orthopedics"]
    );

    const allRes = await fetch(`${baseUrl}/api/admin/specialties?activeOnly=false`, {
      headers: { Authorization: await authHeaderFor(admin) },
    });

    assert.equal(allRes.status, 200);
    const allBody = await allRes.json();
    assert.deepEqual(
      allBody.items.map((item) => item.name),
      ["Cardiology", "Dermatology", "Orthopedics"]
    );
  });

  test("creates department with required fields and duplicate protection", async () => {
    const invalidRes = await fetch(`${baseUrl}/api/admin/departments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: await authHeaderFor(admin),
      },
      body: JSON.stringify({ name: "Emergency", location: "Floor 1" }),
    });

    assert.equal(invalidRes.status, 400);
    assert.deepEqual(await invalidRes.json(), { message: "Số điện thoại là bắt buộc" });

    const createRes = await fetch(`${baseUrl}/api/admin/departments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: await authHeaderFor(admin),
      },
      body: JSON.stringify({
        name: "Emergency",
        location: "Building A - Floor 1",
        phone: "028-1234-2000",
        isActive: true,
      }),
    });

    assert.equal(createRes.status, 201);
    const created = await createRes.json();
    assert.equal(created.name, "Emergency");
    assert.equal(created.location, "Building A - Floor 1");
    assert.equal(created.phone, "028-1234-2000");
    assert.equal(created.isActive, true);

    const duplicateRes = await fetch(`${baseUrl}/api/admin/departments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: await authHeaderFor(admin),
      },
      body: JSON.stringify({
        name: "Emergency",
        location: "Building B",
        phone: "028-9999-9999",
      }),
    });

    assert.equal(duplicateRes.status, 409);
    assert.deepEqual(await duplicateRes.json(), { message: "Khoa/phòng ban đã tồn tại" });
  });

  test("loads department detail with doctor summary", async () => {
    const specialty = await Specialty.create({
      code: "CARD",
      name: "Cardiology",
      isActive: true,
    });
    const department = await Department.create({
      name: "Internal Medicine",
      location: "Building A - Floor 2",
      phone: "028-1234-1001",
      isActive: true,
    });
    const activeDoctorUser = await User.create({
      email: "doctor.active@orcaxcare.com",
      passwordHash: "hash",
      role: "doctor",
      fullName: "Dr. Active",
      isActive: true,
      isEmailVerified: true,
      isLocked: false,
    });
    const inactiveDoctorUser = await User.create({
      email: "doctor.inactive@orcaxcare.com",
      passwordHash: "hash",
      role: "doctor",
      fullName: "Dr. Inactive",
      isActive: true,
      isEmailVerified: true,
      isLocked: false,
    });
    await Doctor.create([
      {
        userId: activeDoctorUser._id,
        specialtyId: specialty._id,
        departmentId: department._id,
        licenseNo: "LIC-ACTIVE",
        isActive: true,
      },
      {
        userId: inactiveDoctorUser._id,
        specialtyId: specialty._id,
        departmentId: department._id,
        licenseNo: "LIC-INACTIVE",
        isActive: false,
      },
    ]);

    const res = await fetch(`${baseUrl}/api/admin/departments/${department._id}`, {
      headers: { Authorization: await authHeaderFor(admin) },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.department.name, "Internal Medicine");
    assert.equal(body.summary.totalDoctors, 2);
    assert.equal(body.summary.activeDoctors, 1);
    assert.deepEqual(
      body.doctors.map((doctor) => ({
        fullName: doctor.fullName,
        specialtyName: doctor.specialtyName,
        isActive: doctor.isActive,
      })),
      [
        { fullName: "Dr. Active", specialtyName: "Cardiology", isActive: true },
        { fullName: "Dr. Inactive", specialtyName: "Cardiology", isActive: false },
      ]
    );
  });
});
