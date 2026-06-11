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
    await Department.db.collection("rooms").deleteMany({});
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
    assert.equal(validateRequired("  ", "Department name"), "Department name is required");
    assert.equal(validateRequired("Cardiology", "Department name"), null);
    assert.equal(validatePhoneOptional("028-1234-1001"), null);
    assert.equal(validatePhoneOptional("abc"), "Invalid phone number");
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
    assert.deepEqual(await res.json(), { message: "Email already in use" });
  });

  test("updates patient profile as admin and returns changed detail", async () => {
    const patientProfile = await Patient.findOne({ userId: patient._id }).lean();

    const detailRes = await fetch(`${baseUrl}/api/admin/patients/${patientProfile._id}`, {
      headers: { Authorization: await authHeaderFor(admin) },
    });

    assert.equal(detailRes.status, 200);
    const detail = await detailRes.json();
    assert.equal(detail.userId, patient._id.toString());
    assert.equal(detail.fullName, "Task One Patient");

    const invalidRes = await fetch(`${baseUrl}/api/admin/patients/${patientProfile._id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: await authHeaderFor(admin),
      },
      body: JSON.stringify({
        fullName: "Task One Patient",
        phone: "0900000000",
        gender: "unknown",
      }),
    });

    assert.equal(invalidRes.status, 400);

    const updateRes = await fetch(`${baseUrl}/api/admin/patients/${patientProfile._id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: await authHeaderFor(admin),
      },
      body: JSON.stringify({
        fullName: "Patient Admin Updated",
        phone: "090 555 6666",
        dateOfBirth: "1998-04-20",
        gender: "female",
        address: "District 1, Ho Chi Minh City",
        emergencyContactName: "Nguyen Van A",
        emergencyContactPhone: "091 111 2222",
        isActive: true,
      }),
    });

    assert.equal(updateRes.status, 200);
    const updated = await updateRes.json();
    assert.equal(updated.fullName, "Patient Admin Updated");
    assert.equal(updated.phone, "090 555 6666");
    assert.equal(updated.profile.dateOfBirth, "1998-04-20");
    assert.equal(updated.profile.gender, "female");
    assert.equal(updated.profile.address, "District 1, Ho Chi Minh City");
    assert.equal(updated.profile.emergencyContactName, "Nguyen Van A");
    assert.equal(updated.profile.emergencyContactPhone, "091 111 2222");

    const savedUser = await User.findById(patient._id).lean();
    const savedPatient = await Patient.findById(patientProfile._id).lean();
    assert.equal(savedUser.fullName, "Patient Admin Updated");
    assert.equal(savedPatient.address, "District 1, Ho Chi Minh City");
  });

  test("filters admin patients by profile and account active status", async () => {
    const inactiveAccountUser = await User.create({
      email: "patient.inactive.account@orcaxcare.com",
      passwordHash: "hash",
      role: "patient",
      fullName: "Inactive Account Patient",
      isActive: false,
      isEmailVerified: true,
      isLocked: false,
    });
    const inactiveProfileUser = await User.create({
      email: "patient.inactive.profile@orcaxcare.com",
      passwordHash: "hash",
      role: "patient",
      fullName: "Inactive Profile Patient",
      isActive: true,
      isEmailVerified: true,
      isLocked: false,
    });
    await Patient.create([
      { userId: inactiveAccountUser._id, isActive: true },
      { userId: inactiveProfileUser._id, isActive: false },
    ]);

    const allRes = await fetch(`${baseUrl}/api/admin/patients`, {
      headers: { Authorization: await authHeaderFor(admin) },
    });
    assert.equal(allRes.status, 200);
    const allBody = await allRes.json();
    assert.equal(allBody.total, 3);

    const activeOnlyRes = await fetch(`${baseUrl}/api/admin/patients?activeOnly=true`, {
      headers: { Authorization: await authHeaderFor(admin) },
    });
    assert.equal(activeOnlyRes.status, 200);
    const activeOnlyBody = await activeOnlyRes.json();
    assert.deepEqual(
      activeOnlyBody.items.map((item) => item.fullName),
      ["Task One Patient"]
    );
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

  test("lists admin doctors with filters and active-only option", async () => {
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
      email: "doctor.list.active@orcaxcare.com",
      passwordHash: "hash",
      role: "doctor",
      fullName: "Dr. List Active",
      isActive: true,
      isEmailVerified: true,
      isLocked: false,
    });
    const inactiveDoctorUser = await User.create({
      email: "doctor.list.inactive@orcaxcare.com",
      passwordHash: "hash",
      role: "doctor",
      fullName: "Dr. List Inactive",
      isActive: true,
      isEmailVerified: true,
      isLocked: false,
    });
    await Doctor.create([
      {
        userId: activeDoctorUser._id,
        specialtyId: specialty._id,
        departmentId: department._id,
        licenseNo: "LIST-ACTIVE",
        isActive: true,
      },
      {
        userId: inactiveDoctorUser._id,
        specialtyId: specialty._id,
        departmentId: department._id,
        licenseNo: "LIST-INACTIVE",
        isActive: false,
      },
    ]);

    const allRes = await fetch(`${baseUrl}/api/admin/doctors?departmentId=${department._id}`, {
      headers: { Authorization: await authHeaderFor(admin) },
    });

    assert.equal(allRes.status, 200);
    const allBody = await allRes.json();
    assert.equal(allBody.total, 2);
    assert.deepEqual(
      allBody.items.map((doctor) => ({
        fullName: doctor.fullName,
        isActive: doctor.isActive,
      })),
      [
        { fullName: "Dr. List Active", isActive: true },
        { fullName: "Dr. List Inactive", isActive: false },
      ]
    );

    const activeOnlyRes = await fetch(
      `${baseUrl}/api/admin/doctors?departmentId=${department._id}&activeOnly=true`,
      { headers: { Authorization: await authHeaderFor(admin) } }
    );

    assert.equal(activeOnlyRes.status, 200);
    const activeOnlyBody = await activeOnlyRes.json();
    assert.equal(activeOnlyBody.total, 1);
    assert.equal(activeOnlyBody.items[0].fullName, "Dr. List Active");

    const inactiveIncludedRes = await fetch(
      `${baseUrl}/api/admin/doctors?departmentId=${department._id}&activeOnly=false`,
      { headers: { Authorization: await authHeaderFor(admin) } }
    );

    assert.equal(inactiveIncludedRes.status, 200);
    const inactiveIncludedBody = await inactiveIncludedRes.json();
    assert.equal(inactiveIncludedBody.total, 2);
  });

  test("updates doctor professional and linked user fields", async () => {
    await User.create({
      email: "doctor.duplicate@orcaxcare.com",
      passwordHash: "hash",
      role: "doctor",
      fullName: "Dr. Duplicate",
      isActive: true,
      isEmailVerified: true,
      isLocked: false,
    });
    const oldSpecialty = await Specialty.create({
      code: "CARD",
      name: "Cardiology",
      isActive: true,
    });
    const newSpecialty = await Specialty.create({
      code: "PED",
      name: "Pediatrics",
      isActive: true,
    });
    const oldDepartment = await Department.create({
      name: "Internal Medicine",
      location: "Building A - Floor 2",
      phone: "028-1234-1001",
      isActive: true,
    });
    const newDepartment = await Department.create({
      name: "Pediatrics Ward",
      location: "Building B - Floor 1",
      phone: "028-1234-2002",
      isActive: true,
    });
    const doctorUser = await User.create({
      email: "doctor.update@orcaxcare.com",
      passwordHash: "hash",
      role: "doctor",
      fullName: "Dr. Before Update",
      phone: "0900000000",
      isActive: true,
      isEmailVerified: true,
      isLocked: false,
    });
    const doctor = await Doctor.create({
      userId: doctorUser._id,
      specialtyId: oldSpecialty._id,
      departmentId: oldDepartment._id,
      licenseNo: "UPDATE-OLD",
      bio: "Before bio",
      isActive: true,
    });

    const duplicateRes = await fetch(`${baseUrl}/api/admin/doctors/${doctor._id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: await authHeaderFor(admin),
      },
      body: JSON.stringify({
        email: "doctor.duplicate@orcaxcare.com",
        fullName: "Dr. Before Update",
        specialtyId: oldSpecialty._id.toString(),
        departmentId: oldDepartment._id.toString(),
        licenseNo: "UPDATE-OLD",
      }),
    });

    assert.equal(duplicateRes.status, 409);

    const updateRes = await fetch(`${baseUrl}/api/admin/doctors/${doctor._id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: await authHeaderFor(admin),
      },
      body: JSON.stringify({
        email: "  Doctor.Updated@OrcaXCare.COM  ",
        fullName: "Dr. After Update",
        phone: "091 222 3333",
        specialtyId: newSpecialty._id.toString(),
        departmentId: newDepartment._id.toString(),
        licenseNo: "UPDATE-NEW",
        bio: "After bio",
        photoUrl: "https://example.com/doctor.png",
        isActive: true,
        accountIsActive: true,
      }),
    });

    assert.equal(updateRes.status, 200);
    const updated = await updateRes.json();
    assert.equal(updated.email, "doctor.updated@orcaxcare.com");
    assert.equal(updated.fullName, "Dr. After Update");
    assert.equal(updated.phone, "091 222 3333");
    assert.equal(updated.specialtyId, newSpecialty._id.toString());
    assert.equal(updated.departmentId, newDepartment._id.toString());
    assert.equal(updated.licenseNo, "UPDATE-NEW");
    assert.equal(updated.bio, "After bio");
    assert.equal(updated.isActive, true);

    const oldDepartmentSearch = await fetch(`${baseUrl}/api/public/doctors?departmentId=${oldDepartment._id}`);
    assert.equal(oldDepartmentSearch.status, 200);
    assert.equal((await oldDepartmentSearch.json()).total, 0);

    const newDepartmentSearch = await fetch(`${baseUrl}/api/public/doctors?departmentId=${newDepartment._id}`);
    assert.equal(newDepartmentSearch.status, 200);
    const newSearchBody = await newDepartmentSearch.json();
    assert.equal(newSearchBody.total, 1);
    assert.equal(newSearchBody.items[0].fullName, "Dr. After Update");
    assert.equal(newSearchBody.items[0].specialty.name, "Pediatrics");
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
    assert.deepEqual(await invalidRes.json(), { message: "Phone number is required" });

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
    assert.deepEqual(await duplicateRes.json(), { message: "Department already exists" });
  });

  test("loads department detail with room and doctor summaries", async () => {
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
    await Department.db.collection("rooms").insertMany([
      {
        departmentId: department._id,
        name: "Consultation Room 201",
        floor: "2",
        isActive: true,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      {
        departmentId: department._id,
        name: "Consultation Room 202",
        floor: "2",
        isActive: false,
        createdAt: new Date("2026-01-02T00:00:00.000Z"),
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
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
    assert.equal(body.summary.totalRooms, 2);
    assert.equal(body.summary.activeRooms, 1);
    assert.deepEqual(
      body.rooms.map((room) => ({
        name: room.name,
        floor: room.floor,
        isActive: room.isActive,
      })),
      [
        { name: "Consultation Room 201", floor: "2", isActive: true },
        { name: "Consultation Room 202", floor: "2", isActive: false },
      ]
    );
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
