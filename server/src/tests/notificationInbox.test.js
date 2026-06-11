import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, beforeEach, describe, test } from "node:test";
import http from "node:http";
import path from "node:path";
import { createApp } from "../app.js";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { AuthToken } from "../models/AuthToken.js";
import { Notification } from "../models/Notification.js";
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

describe("UC-10 Notification Inbox", () => {
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
    await Notification.deleteMany({});
    await Patient.deleteMany({});
    await User.deleteMany({});

    patientUser = await User.create({
      email: "patient.notifications@orcaxcare.com",
      passwordHash: "hash",
      role: "patient",
      fullName: "Notification Patient",
      isActive: true,
      isEmailVerified: true,
    });

    otherUser = await User.create({
      email: "other.notifications@orcaxcare.com",
      passwordHash: "hash",
      role: "patient",
      fullName: "Other Notification Patient",
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

  test("lists only authenticated patient notifications newest first", async () => {
    const older = await Notification.create({
      userId: patientUser._id,
      title: "Appointment reminder",
      message: "Your visit starts at 09:00.",
      type: "appointment",
      createdAt: new Date("2026-06-10T09:00:00.000Z"),
      updatedAt: new Date("2026-06-10T09:00:00.000Z"),
    });
    const newer = await Notification.create({
      userId: patientUser._id,
      title: "Prescription ready",
      message: "Your prescription is ready to view.",
      type: "prescription",
      link: "/patient/prescriptions/rx-1",
      createdAt: new Date("2026-06-11T09:00:00.000Z"),
      updatedAt: new Date("2026-06-11T09:00:00.000Z"),
    });
    await Notification.create({
      userId: otherUser._id,
      title: "Private for another patient",
      message: "This should not leak.",
      type: "system",
    });

    const res = await fetch(`${baseUrl}/api/patient/notifications`, {
      headers: { Authorization: await authHeaderFor(patientUser) },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.total, 2);
    assert.equal(body.unreadCount, 2);
    assert.equal(body.items[0]._id, newer._id.toString());
    assert.equal(body.items[0].title, "Prescription ready");
    assert.equal(body.items[0].isRead, false);
    assert.equal(body.items[0].link, "/patient/prescriptions/rx-1");
    assert.equal(body.items[1]._id, older._id.toString());
  });

  test("filters unread notifications", async () => {
    await Notification.create({
      userId: patientUser._id,
      title: "Already read",
      message: "This one was opened.",
      readAt: new Date("2026-06-10T10:00:00.000Z"),
    });
    await Notification.create({
      userId: patientUser._id,
      title: "Needs attention",
      message: "This one is unread.",
    });

    const res = await fetch(`${baseUrl}/api/patient/notifications?status=unread`, {
      headers: { Authorization: await authHeaderFor(patientUser) },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.total, 1);
    assert.equal(body.unreadCount, 1);
    assert.equal(body.items[0].title, "Needs attention");
    assert.equal(body.items[0].isRead, false);
  });

  test("marks own notification as read", async () => {
    const notification = await Notification.create({
      userId: patientUser._id,
      title: "Queue update",
      message: "Your queue number is next.",
      type: "queue",
    });

    const res = await fetch(`${baseUrl}/api/patient/notifications/${notification._id}/read`, {
      method: "PUT",
      headers: { Authorization: await authHeaderFor(patientUser) },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body._id, notification._id.toString());
    assert.equal(body.isRead, true);
    assert.match(body.readAt, /^2026-|^2027-|^2028-|^2029-|^203/);

    const stored = await Notification.findById(notification._id);
    assert.ok(stored.readAt);
  });

  test("does not mark another patient's notification as read", async () => {
    const otherNotification = await Notification.create({
      userId: otherUser._id,
      title: "Other patient message",
      message: "Only the owner can read this.",
    });

    const res = await fetch(`${baseUrl}/api/patient/notifications/${otherNotification._id}/read`, {
      method: "PUT",
      headers: { Authorization: await authHeaderFor(patientUser) },
    });

    assert.equal(res.status, 404);
    const stored = await Notification.findById(otherNotification._id);
    assert.equal(stored.readAt, null);
  });
});
