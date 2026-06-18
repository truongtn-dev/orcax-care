import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, beforeEach, describe, test } from "node:test";
import http from "node:http";
import path from "node:path";
import { createApp } from "../app.js";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { AuthToken } from "../models/AuthToken.js";
import { InsuranceCard } from "../models/InsuranceCard.js";
import { Patient } from "../models/Patient.js";
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

describe("UC-13 Insurance Card List", () => {
  let server;
  let baseUrl;
  let patientUser;
  let otherUser;

  before(async () => {
    process.env.MONGODB_URI = "memory";
    await connectDatabase();
    server = await listen(createApp());
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  beforeEach(async () => {
    await AuthToken.deleteMany({});
    await InsuranceCard.deleteMany({});
    await Patient.deleteMany({});
    await User.deleteMany({});

    patientUser = await User.create({
      email: "patient.insurance@orcaxcare.com",
      passwordHash: "hash",
      role: "patient",
      fullName: "Insurance Patient",
      isActive: true,
      isEmailVerified: true,
    });

    otherUser = await User.create({
      email: "other.insurance@orcaxcare.com",
      passwordHash: "hash",
      role: "patient",
      fullName: "Other Patient",
      isActive: true,
      isEmailVerified: true,
    });

    await Patient.create({ userId: patientUser._id, isActive: true });
    await Patient.create({ userId: otherUser._id, isActive: true });
  });

  after(async () => {
    if (server) await close(server);
    await disconnectDatabase();
  });

  test("returns empty list for patient without policies", async () => {
    const res = await fetch(`${baseUrl}/api/patient/insurance-cards`, {
      headers: { Authorization: await authHeaderFor(patientUser) },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.total, 0);
    assert.deepEqual(body.items, []);
  });

  test("lists only the authenticated patient policies", async () => {
    await InsuranceCard.create({
      userId: patientUser._id,
      providerName: "Bao Viet",
      policyNumber: "BV-001",
      holderName: "Insurance Patient",
      isPrimary: true,
    });
    await InsuranceCard.create({
      userId: otherUser._id,
      providerName: "Prudential",
      policyNumber: "PRU-999",
      holderName: "Other Patient",
    });

    const res = await fetch(`${baseUrl}/api/patient/insurance-cards`, {
      headers: { Authorization: await authHeaderFor(patientUser) },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.total, 1);
    assert.equal(body.items[0].policyNumber, "BV-001");
    assert.equal(body.items[0].isPrimary, true);
  });

  test("creates insurance card for add CTA flow", async () => {
    const res = await fetch(`${baseUrl}/api/patient/insurance-cards`, {
      method: "POST",
      headers: {
        Authorization: await authHeaderFor(patientUser),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        providerName: "Social Health Insurance",
        policyNumber: "SHI-2026-01",
        holderName: "Insurance Patient",
        coverageType: "Outpatient",
        validFrom: "2026-01-01",
        validTo: "2026-12-31",
        isPrimary: true,
      }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.providerName, "Social Health Insurance");
    assert.equal(body.validFrom, "2026-01-01");

    const listRes = await fetch(`${baseUrl}/api/patient/insurance-cards`, {
      headers: { Authorization: await authHeaderFor(patientUser) },
    });
    const listBody = await listRes.json();
    assert.equal(listBody.total, 1);
  });

  test("updates insurance card for edit flow", async () => {
    const card = await InsuranceCard.create({
      userId: patientUser._id,
      providerName: "Bao Viet",
      policyNumber: "BV-001",
      holderName: "Insurance Patient",
      coveragePercent: 20,
      validFrom: new Date("2026-01-01"),
      validTo: new Date("2026-12-31"),
    });

    const res = await fetch(`${baseUrl}/api/patient/insurance-cards/${card._id}`, {
      method: "PUT",
      headers: {
        Authorization: await authHeaderFor(patientUser),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        providerName: "Bao Viet Plus",
        coveragePercent: 50,
        isPrimary: true,
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.providerName, "Bao Viet Plus");
    assert.equal(body.policyNumber, "BV-001");
    assert.equal(body.coveragePercent, 50);
    assert.equal(body.isPrimary, true);
  });

  test("rejects duplicate policy number on update", async () => {
    await InsuranceCard.create({
      userId: patientUser._id,
      providerName: "Bao Viet",
      policyNumber: "BV-001",
      holderName: "Insurance Patient",
    });
    const second = await InsuranceCard.create({
      userId: patientUser._id,
      providerName: "Prudential",
      policyNumber: "PRU-002",
      holderName: "Insurance Patient",
    });

    const res = await fetch(`${baseUrl}/api/patient/insurance-cards/${second._id}`, {
      method: "PUT",
      headers: {
        Authorization: await authHeaderFor(patientUser),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ policyNumber: "BV-001" }),
    });
    assert.equal(res.status, 409);
  });

  test("soft-deletes insurance card", async () => {
    const card = await InsuranceCard.create({
      userId: patientUser._id,
      providerName: "Bao Viet",
      policyNumber: "BV-001",
      holderName: "Insurance Patient",
      isPrimary: true,
    });

    const delRes = await fetch(`${baseUrl}/api/patient/insurance-cards/${card._id}`, {
      method: "DELETE",
      headers: { Authorization: await authHeaderFor(patientUser) },
    });
    assert.equal(delRes.status, 200);

    const listRes = await fetch(`${baseUrl}/api/patient/insurance-cards`, {
      headers: { Authorization: await authHeaderFor(patientUser) },
    });
    const listBody = await listRes.json();
    assert.equal(listBody.total, 0);

    const stored = await InsuranceCard.findById(card._id).lean();
    assert.equal(stored.isActive, false);
    assert.equal(stored.isPrimary, false);
  });

  test("returns 404 when updating another patient card", async () => {
    const otherCard = await InsuranceCard.create({
      userId: otherUser._id,
      providerName: "Prudential",
      policyNumber: "PRU-999",
      holderName: "Other Patient",
    });

    const res = await fetch(`${baseUrl}/api/patient/insurance-cards/${otherCard._id}`, {
      method: "PUT",
      headers: {
        Authorization: await authHeaderFor(patientUser),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ providerName: "Hacked" }),
    });
    assert.equal(res.status, 404);
  });
});
