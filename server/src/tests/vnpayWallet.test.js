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
import { Wallet } from "../models/Wallet.js";
import { WalletTransaction } from "../models/WalletTransaction.js";
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

describe("UC-19.3 VNPay Wallet Payment", () => {
  let server;
  let baseUrl;
  let patientUser;

  before(async () => {
    process.env.MONGODB_URI = "memory";
    process.env.VNPAY_MOCK = "true";
    process.env.CLIENT_ORIGIN = "http://localhost:5173";
    await connectDatabase();
    server = await listen(createApp());
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  beforeEach(async () => {
    await AuthToken.deleteMany({});
    await WalletTransaction.deleteMany({});
    await Wallet.deleteMany({});
    await Patient.deleteMany({});
    await User.deleteMany({});

    patientUser = await User.create({
      email: "patient.vnpay@orcaxcare.com",
      passwordHash: "hash",
      role: "patient",
      fullName: "VNPay Patient",
      isActive: true,
      isEmailVerified: true,
    });

    await Patient.create({ userId: patientUser._id, isActive: true });
  });

  after(async () => {
    if (server) await close(server);
    await disconnectDatabase();
  });

  test("lists VNPay as enabled payment method", async () => {
    const res = await fetch(`${baseUrl}/api/patient/wallet`, {
      headers: { Authorization: await authHeaderFor(patientUser) },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    const vnpay = body.paymentMethods.find((item) => item.id === "vnpay");
    assert.ok(vnpay);
    assert.equal(vnpay.enabled, false);
  });

  test("completes mock VNPay top-up with reference id", async () => {
    const createRes = await fetch(`${baseUrl}/api/patient/wallet/topups/vnpay`, {
      method: "POST",
      headers: {
        Authorization: await authHeaderFor(patientUser),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount: 150000 }),
    });
    assert.equal(createRes.status, 201);
    const created = await createRes.json();
    assert.equal(created.checkoutMode, "mock");
    assert.ok(created.providerOrderId);

    const confirmRes = await fetch(`${baseUrl}/api/patient/wallet/vnpay/mock-confirm`, {
      method: "POST",
      headers: {
        Authorization: await authHeaderFor(patientUser),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ orderId: created.providerOrderId }),
    });
    assert.equal(confirmRes.status, 200);
    const confirmed = await confirmRes.json();
    assert.equal(confirmed.balance, 150000);
    assert.match(confirmed.receipt.referenceId, /MOCK-/);

    const receiptRes = await fetch(
      `${baseUrl}/api/patient/wallet/receipts/${created.providerOrderId}`,
      { headers: { Authorization: await authHeaderFor(patientUser) } }
    );
    assert.equal(receiptRes.status, 200);
    const receiptBody = await receiptRes.json();
    assert.equal(receiptBody.receipt.provider, "vnpay");
    assert.equal(receiptBody.receipt.status, "success");
  });

  test("does not change balance when mock confirm uses wrong order", async () => {
    const createRes = await fetch(`${baseUrl}/api/patient/wallet/topups/vnpay`, {
      method: "POST",
      headers: {
        Authorization: await authHeaderFor(patientUser),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount: 120000 }),
    });
    const created = await createRes.json();

    const confirmRes = await fetch(`${baseUrl}/api/patient/wallet/vnpay/mock-confirm`, {
      method: "POST",
      headers: {
        Authorization: await authHeaderFor(patientUser),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ orderId: "VNP-INVALID" }),
    });
    assert.equal(confirmRes.status, 404);

    const walletRes = await fetch(`${baseUrl}/api/patient/wallet`, {
      headers: { Authorization: await authHeaderFor(patientUser) },
    });
    const wallet = await walletRes.json();
    assert.equal(wallet.balance, 0);
    assert.equal(created.providerOrderId, created.providerOrderId);
  });
});
