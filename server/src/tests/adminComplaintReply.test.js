import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, beforeEach, describe, test } from "node:test";
import http from "node:http";
import path from "node:path";
import { createApp } from "../app.js";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { AuthToken } from "../models/AuthToken.js";
import { Complaint } from "../models/Complaint.js";
import { ComplaintReply } from "../models/ComplaintReply.js";
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

describe("Admin complaint reply notifies patient", () => {
  let server;
  let baseUrl;
  let adminUser;
  let patientUser;
  let complaint;

  before(async () => {
    process.env.MONGODB_URI = "memory";
    await connectDatabase();
    server = await listen(createApp());
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  beforeEach(async () => {
    await AuthToken.deleteMany({});
    await Notification.deleteMany({});
    await ComplaintReply.deleteMany({});
    await Complaint.deleteMany({});
    await Patient.deleteMany({});
    await User.deleteMany({});

    adminUser = await User.create({
      email: "admin.reply@orcaxcare.com",
      passwordHash: "hash",
      role: "admin",
      fullName: "Support Admin",
      isActive: true,
      isEmailVerified: true,
    });

    patientUser = await User.create({
      email: "patient.reply@orcaxcare.com",
      passwordHash: "hash",
      role: "patient",
      fullName: "Reply Patient",
      isActive: true,
      isEmailVerified: true,
    });
    await Patient.create({ userId: patientUser._id, isActive: true });

    complaint = await Complaint.create({
      ticketId: "CMP-TEST-REPLY",
      patientUserId: patientUser._id,
      category: "billing",
      ticketType: "complaint",
      subject: "[Billing] Reply ticket",
      content: "Please review my invoice.",
      status: "open",
      statusUpdatedAt: new Date(),
    });
  });

  after(async () => {
    if (server) await close(server);
    await disconnectDatabase();
  });

  test("admin reply creates a notification for the patient and advances status", async () => {
    const res = await fetch(`${baseUrl}/api/admin/complaints/${complaint._id}/replies`, {
      method: "POST",
      headers: {
        Authorization: await authHeaderFor(adminUser),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: "We are looking into your invoice now." }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.complaint.status, "in_progress");
    assert.equal(body.replies.length, 1);

    const notification = await Notification.findOne({ userId: patientUser._id }).lean();
    assert.ok(notification, "expected a notification to be created for the patient");
    assert.equal(notification.type, "complaint");
    assert.match(notification.message, /replied/i);
    assert.equal(notification.link, `/patient/complaints/${complaint._id.toString()}`);
  });

  test("admin status update also notifies the patient", async () => {
    const res = await fetch(`${baseUrl}/api/admin/complaints/${complaint._id}/status`, {
      method: "PATCH",
      headers: {
        Authorization: await authHeaderFor(adminUser),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "resolved" }),
    });

    assert.equal(res.status, 200);

    const notification = await Notification.findOne({ userId: patientUser._id }).lean();
    assert.ok(notification);
    assert.equal(notification.type, "complaint");
    assert.match(notification.message, /resolved/i);
  });
});
