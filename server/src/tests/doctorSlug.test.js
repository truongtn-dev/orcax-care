import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, beforeEach, describe, test } from "node:test";
import http from "node:http";
import path from "node:path";
import { createApp } from "../app.js";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { Department } from "../models/Department.js";
import { Doctor } from "../models/Doctor.js";
import { Specialty } from "../models/Specialty.js";
import { User } from "../models/User.js";
import { slugifyDoctorName } from "../utils/doctorSlug.js";

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

describe("Doctor profile slugs", () => {
  let server;
  let baseUrl;
  let doctor;

  before(async () => {
    process.env.MONGODB_URI = "memory";
    await connectDatabase();
    server = await listen(createApp());
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  beforeEach(async () => {
    await Doctor.deleteMany({});
    await Department.deleteMany({});
    await Specialty.deleteMany({});
    await User.deleteMany({});

    const specialty = await Specialty.create({ code: "PED", name: "Pediatrics" });
    const department = await Department.create({
      name: "Pediatrics Ward",
      location: "C1",
      phone: "0281234567",
    });

    const doctorUser = await User.create({
      email: "doctor.cuong@orcaxcare.com",
      passwordHash: "hash",
      role: "doctor",
      fullName: "Dr. Le Minh Cuong",
      isActive: true,
      isEmailVerified: true,
    });

    doctor = await Doctor.create({
      userId: doctorUser._id,
      specialtyId: specialty._id,
      departmentId: department._id,
      licenseNo: "LIC-SLUG-01",
      bio: "Pediatrician with focus on preventive care.",
      isActive: true,
    });
  });

  after(async () => {
    await close(server);
    await disconnectDatabase();
  });

  test("slugifyDoctorName normalizes doctor names", () => {
    assert.equal(slugifyDoctorName("Dr. Le Minh Cuong"), "dr-le-minh-cuong");
    assert.equal(slugifyDoctorName("BS. Nguyễn Văn An"), "bs-nguyen-van-an");
  });

  test("Doctor.create assigns a unique slug", () => {
    assert.equal(doctor.slug, "dr-le-minh-cuong");
  });

  test("GET /api/public/doctors/:slug returns doctor profile", async () => {
    const res = await fetch(`${baseUrl}/api/public/doctors/${doctor.slug}`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.slug, "dr-le-minh-cuong");
    assert.equal(body.fullName, "Dr. Le Minh Cuong");
    assert.equal(body._id, doctor._id.toString());
  });

  test("GET /api/public/doctors/:id still resolves legacy ObjectId URLs", async () => {
    const res = await fetch(`${baseUrl}/api/public/doctors/${doctor._id}`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.slug, "dr-le-minh-cuong");
  });
});
