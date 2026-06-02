import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, beforeEach, describe, test } from "node:test";
import http from "node:http";
import path from "node:path";
import { createApp } from "../app.js";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { AuthToken } from "../models/AuthToken.js";
import { Patient } from "../models/Patient.js";
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
});
