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
import { FavoriteDoctor } from "../models/FavoriteDoctor.js";
import { Patient } from "../models/Patient.js";
import { Specialty } from "../models/Specialty.js";
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

describe("UC-15 Favorites Doctors", () => {
  let server;
  let baseUrl;
  let patientUser;
  let doctorUser;
  let doctor;

  before(async () => {
    process.env.MONGODB_URI = "memory";
    await connectDatabase();
    server = await listen(createApp());
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  beforeEach(async () => {
    await AuthToken.deleteMany({});
    await FavoriteDoctor.deleteMany({});
    await Doctor.deleteMany({});
    await Patient.deleteMany({});
    await User.deleteMany({});
    await Specialty.deleteMany({});
    await Department.deleteMany({});

    const specialty = await Specialty.create({
      name: "Cardiology",
      code: "CARD",
      description: "Cardiology",
      isActive: true,
    });

    const department = await Department.create({
      name: "Internal Medicine",
      description: "Internal",
      isActive: true,
    });

    patientUser = await User.create({
      email: "patient.favorite@orcaxcare.com",
      passwordHash: "hash",
      role: "patient",
      fullName: "Favorite Patient",
      isActive: true,
      isEmailVerified: true,
    });

    doctorUser = await User.create({
      email: "doctor.favorite@orcaxcare.com",
      passwordHash: "hash",
      role: "doctor",
      fullName: "Dr Favorite",
      isActive: true,
      isEmailVerified: true,
    });

    await Patient.create({ userId: patientUser._id, isActive: true });

    doctor = await Doctor.create({
      userId: doctorUser._id,
      specialtyId: specialty._id,
      departmentId: department._id,
      licenseNo: "LIC-FAVORITE-01",
      bio: "Experienced physician",
      isActive: true,
    });
  });

  after(async () => {
    if (server) await close(server);
    await disconnectDatabase();
  });

  test("adds doctor to favorites and lists it", async () => {
    const addRes = await fetch(`${baseUrl}/api/patient/favorites/${doctor._id}`, {
      method: "POST",
      headers: { Authorization: await authHeaderFor(patientUser) },
    });
    assert.equal(addRes.status, 201);

    const listRes = await fetch(`${baseUrl}/api/patient/favorites`, {
      headers: { Authorization: await authHeaderFor(patientUser) },
    });
    assert.equal(listRes.status, 200);
    const body = await listRes.json();
    assert.equal(body.total, 1);
    assert.equal(body.items[0].doctor._id, doctor._id.toString());
    assert.equal(body.items[0].doctor.fullName, "Dr Favorite");
  });

  test("removes doctor from favorites", async () => {
    await FavoriteDoctor.create({ userId: patientUser._id, doctorId: doctor._id });

    const removeRes = await fetch(`${baseUrl}/api/patient/favorites/${doctor._id}`, {
      method: "DELETE",
      headers: { Authorization: await authHeaderFor(patientUser) },
    });
    assert.equal(removeRes.status, 200);

    const listRes = await fetch(`${baseUrl}/api/patient/favorites`, {
      headers: { Authorization: await authHeaderFor(patientUser) },
    });
    const body = await listRes.json();
    assert.equal(body.total, 0);
  });
});
