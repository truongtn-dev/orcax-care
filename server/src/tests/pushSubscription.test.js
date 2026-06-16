import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, beforeEach, describe, test } from "node:test";
import http from "node:http";
import path from "node:path";
import { createApp } from "../app.js";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { AuthToken } from "../models/AuthToken.js";
import { Patient } from "../models/Patient.js";
import { PushSubscription } from "../models/PushSubscription.js";
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

function subscriptionPayload(overrides = {}) {
  return {
    endpoint: "https://push.example.test/subscriptions/patient-browser-1",
    keys: {
      p256dh: "patient-public-key",
      auth: "patient-auth-secret",
    },
    permission: "granted",
    userAgent: "Node Test Browser",
    ...overrides,
  };
}

describe("UC-10.1 Subscribe Browser Push", () => {
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
    await PushSubscription.deleteMany({});
    await Patient.deleteMany({});
    await User.deleteMany({});

    patientUser = await User.create({
      email: "patient.push@orcaxcare.com",
      passwordHash: "hash",
      role: "patient",
      fullName: "Push Patient",
      isActive: true,
      isEmailVerified: true,
    });

    otherUser = await User.create({
      email: "other.push@orcaxcare.com",
      passwordHash: "hash",
      role: "patient",
      fullName: "Other Push Patient",
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

  test("returns no active subscription before the browser subscribes", async () => {
    const res = await fetch(`${baseUrl}/api/patient/push-subscription`, {
      headers: { Authorization: await authHeaderFor(patientUser) },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.isSubscribed, false);
    assert.equal(body.subscription, null);
    assert.equal(body.vapidPublicKey, "");
  });

  test("stores the authenticated patient's browser push subscription", async () => {
    const res = await fetch(`${baseUrl}/api/patient/push-subscription`, {
      method: "POST",
      headers: {
        Authorization: await authHeaderFor(patientUser),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subscriptionPayload()),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.isSubscribed, true);
    assert.equal(body.subscription.endpoint, "https://push.example.test/subscriptions/patient-browser-1");
    assert.equal(body.subscription.permission, "granted");
    assert.equal(body.subscription.isActive, true);

    const stored = await PushSubscription.findOne({ userId: patientUser._id });
    assert.equal(stored.endpoint, "https://push.example.test/subscriptions/patient-browser-1");
    assert.equal(stored.keys.p256dh, "patient-public-key");
  });

  test("updates an existing endpoint instead of creating duplicates", async () => {
    await PushSubscription.create({
      userId: patientUser._id,
      endpoint: "https://push.example.test/subscriptions/patient-browser-1",
      keys: { p256dh: "old-key", auth: "old-secret" },
      permission: "granted",
      isActive: false,
    });

    const res = await fetch(`${baseUrl}/api/patient/push-subscription`, {
      method: "POST",
      headers: {
        Authorization: await authHeaderFor(patientUser),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subscriptionPayload({ keys: { p256dh: "new-key", auth: "new-secret" } })),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.subscription.keys.p256dh, "new-key");
    assert.equal(body.subscription.isActive, true);

    const count = await PushSubscription.countDocuments({ userId: patientUser._id });
    assert.equal(count, 1);
  });

  test("deactivates only the authenticated patient's subscription", async () => {
    await PushSubscription.create({
      userId: otherUser._id,
      endpoint: "https://push.example.test/subscriptions/other-browser",
      keys: { p256dh: "other-key", auth: "other-secret" },
      permission: "granted",
      isActive: true,
    });
    await PushSubscription.create({
      userId: patientUser._id,
      endpoint: "https://push.example.test/subscriptions/patient-browser-1",
      keys: { p256dh: "patient-key", auth: "patient-secret" },
      permission: "granted",
      isActive: true,
    });

    const res = await fetch(`${baseUrl}/api/patient/push-subscription`, {
      method: "DELETE",
      headers: { Authorization: await authHeaderFor(patientUser) },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.isSubscribed, false);

    const patientStored = await PushSubscription.findOne({ userId: patientUser._id });
    const otherStored = await PushSubscription.findOne({ userId: otherUser._id });
    assert.equal(patientStored.isActive, false);
    assert.equal(otherStored.isActive, true);
  });
});
