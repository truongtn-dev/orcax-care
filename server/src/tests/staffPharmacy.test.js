import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, beforeEach, describe, test } from "node:test";
import http from "node:http";
import path from "node:path";
import { createApp } from "../app.js";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { AuthToken } from "../models/AuthToken.js";
import { Medicine } from "../models/Medicine.js";
import { StockMovement } from "../models/StockMovement.js";
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

describe("Staff pharmacy — stock inbound", () => {
  let server;
  let baseUrl;
  let staffUser;
  let medicine;

  before(async () => {
    process.env.MONGODB_URI = "memory";
    await connectDatabase();
    server = await listen(createApp());
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  beforeEach(async () => {
    await AuthToken.deleteMany({});
    await StockMovement.deleteMany({});
    await Medicine.deleteMany({});
    await User.deleteMany({});

    staffUser = await User.create({
      email: "staff.pharmacy@orcaxcare.com",
      passwordHash: "hash",
      role: "staff",
      fullName: "Pharmacy Staff",
      isActive: true,
      isEmailVerified: true,
    });

    medicine = await Medicine.create({
      code: "TESTMED",
      name: "Test Medicine",
      unit: "tablet",
      stockQty: 10,
      minStockLevel: 5,
    });
  });

  after(async () => {
    await close(server);
    await disconnectDatabase();
  });

  test("POST /api/staff/pharmacy/stock-inbound increases stock and records ledger", async () => {
    const auth = await authHeaderFor(staffUser);
    const res = await fetch(`${baseUrl}/api/staff/pharmacy/stock-inbound`, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        medicineId: medicine._id.toString(),
        quantity: 15,
        batchNo: "BATCH-001",
        supplierRef: "SUP-88",
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.medicine.stockQty, 25);

    const stored = await Medicine.findById(medicine._id);
    assert.equal(stored.stockQty, 25);
    assert.equal(await StockMovement.countDocuments({ medicineId: medicine._id, type: "inbound" }), 1);
  });

  test("GET /api/staff/pharmacy/medicines/:id returns read-only batches and movements", async () => {
    const auth = await authHeaderFor(staffUser);
    await StockMovement.create([
      {
        medicineId: medicine._id,
        type: "inbound",
        quantity: 20,
        batchNo: "BATCH-A",
        expiryDate: new Date("2027-01-15T00:00:00.000Z"),
        supplierRef: "SUP-A",
        performedBy: staffUser._id,
      },
      {
        medicineId: medicine._id,
        type: "outbound",
        quantity: 5,
        batchNo: "BATCH-A",
        performedBy: staffUser._id,
      },
      {
        medicineId: medicine._id,
        type: "inbound",
        quantity: 8,
        batchNo: "BATCH-B",
        expiryDate: new Date("2027-03-20T00:00:00.000Z"),
        supplierRef: "SUP-B",
        performedBy: staffUser._id,
      },
    ]);

    const res = await fetch(`${baseUrl}/api/staff/pharmacy/medicines/${medicine._id}`, {
      headers: { Authorization: auth },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.medicine.code, "TESTMED");
    assert.equal(body.batches.length, 2);
    const batchA = body.batches.find((batch) => batch.batchNo === "BATCH-A");
    const batchB = body.batches.find((batch) => batch.batchNo === "BATCH-B");
    assert.equal(batchB.onHandQty, 8);
    assert.equal(batchA.inboundQty, 20);
    assert.equal(batchA.outboundQty, 5);
    assert.equal(batchA.onHandQty, 15);
    assert.equal(body.movements.length, 3);
    assert.equal(body.movements[0].medicine.code, "TESTMED");
  });
});
