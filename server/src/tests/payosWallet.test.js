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

describe("UC-19.2 PayOS Wallet Payment", () => {
  let server;
  let baseUrl;
  let patientUser;

  before(async () => {
    process.env.MONGODB_URI = "memory";
    process.env.PAYOS_MOCK = "true";
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
      email: "patient.payos@orcaxcare.com",
      passwordHash: "hash",
      role: "patient",
      fullName: "PayOS Patient",
      isActive: true,
      isEmailVerified: true,
    });

    await Patient.create({ userId: patientUser._id, isActive: true });
  });

  after(async () => {
    if (server) await close(server);
    await disconnectDatabase();
  });

  test("returns wallet overview with limits", async () => {
    const res = await fetch(`${baseUrl}/api/patient/wallet`, {
      headers: { Authorization: await authHeaderFor(patientUser) },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.balance, 0);
    assert.equal(body.limits.minTopup, 10000);
    assert.ok(body.paymentMethods.some((item) => item.id === "payos"));
    assert.ok(body.stats);
    assert.equal(body.stats.totalTopup, 0);
  });

  test("rejects top-up below minimum amount", async () => {
    const res = await fetch(`${baseUrl}/api/patient/wallet/topups/payos`, {
      method: "POST",
      headers: {
        Authorization: await authHeaderFor(patientUser),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount: 5000 }),
    });
    assert.equal(res.status, 400);
  });

  test("completes mock PayOS top-up and credits balance", async () => {
    const createRes = await fetch(`${baseUrl}/api/patient/wallet/topups/payos`, {
      method: "POST",
      headers: {
        Authorization: await authHeaderFor(patientUser),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount: 100000 }),
    });
    assert.equal(createRes.status, 201);
    const created = await createRes.json();
    assert.equal(created.checkoutMode, "mock");
    assert.ok(created.orderCode);

    const confirmRes = await fetch(`${baseUrl}/api/patient/wallet/payos/mock-confirm`, {
      method: "POST",
      headers: {
        Authorization: await authHeaderFor(patientUser),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ orderCode: created.orderCode }),
    });
    assert.equal(confirmRes.status, 200);
    const confirmed = await confirmRes.json();
    assert.equal(confirmed.balance, 100000);
    assert.equal(confirmed.receipt.amount, 100000);

    const walletRes = await fetch(`${baseUrl}/api/patient/wallet`, {
      headers: { Authorization: await authHeaderFor(patientUser) },
    });
    const wallet = await walletRes.json();
    assert.equal(wallet.balance, 100000);
  });

  test("filters wallet transactions by type and returns aggregate stats", async () => {
    await Wallet.create({ userId: patientUser._id, balance: 150000 });
    await WalletTransaction.create([
      {
        userId: patientUser._id,
        type: "topup",
        amount: 100000,
        status: "success",
        provider: "payos",
        orderCode: 910001,
      },
      {
        userId: patientUser._id,
        type: "deduct",
        amount: 50000,
        status: "success",
        provider: "internal",
        description: "Booking confirm",
      },
    ]);

    const res = await fetch(`${baseUrl}/api/patient/wallet?type=deduct`, {
      headers: { Authorization: await authHeaderFor(patientUser) },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.transactions.length, 1);
    assert.equal(body.transactions[0].type, "deduct");
    assert.equal(body.stats.totalTopup, 100000);
    assert.equal(body.stats.totalSpent, 50000);
  });

  test("blocks deduct when balance is insufficient", async () => {
    const res = await fetch(`${baseUrl}/api/patient/wallet/deduct`, {
      method: "POST",
      headers: {
        Authorization: await authHeaderFor(patientUser),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount: 50000, description: "Booking confirm" }),
    });
    assert.equal(res.status, 409);
    const body = await res.json();
    assert.match(body.message, /Insufficient/i);
  });

  test("deducts wallet balance for booking confirm", async () => {
    await Wallet.create({ userId: patientUser._id, balance: 200000 });

    const res = await fetch(`${baseUrl}/api/patient/wallet/deduct`, {
      method: "POST",
      headers: {
        Authorization: await authHeaderFor(patientUser),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount: 75000, description: "Booking confirm" }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.balance, 125000);
  });
});
