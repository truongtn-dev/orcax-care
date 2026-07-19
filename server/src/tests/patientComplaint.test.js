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

describe("UC-11 Patient complaints", () => {
  let server;
  let baseUrl;
  let patientUser;

  before(async () => {
    process.env.MONGODB_URI = "memory";
    await connectDatabase();
    server = await listen(createApp());
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  let otherPatientUser;

  beforeEach(async () => {
    await AuthToken.deleteMany({});
    await ComplaintReply.deleteMany({});
    await Complaint.deleteMany({});
    await Patient.deleteMany({});
    await User.deleteMany({});

    patientUser = await User.create({
      email: "patient.complaint@orcaxcare.com",
      passwordHash: "hash",
      role: "patient",
      fullName: "Complaint Patient",
      isActive: true,
      isEmailVerified: true,
    });
    await Patient.create({ userId: patientUser._id, isActive: true });

    otherPatientUser = await User.create({
      email: "other.patient.complaint@orcaxcare.com",
      passwordHash: "hash",
      role: "patient",
      fullName: "Other Patient",
      isActive: true,
      isEmailVerified: true,
    });
    await Patient.create({ userId: otherPatientUser._id, isActive: true });
  });

  after(async () => {
    if (server) await close(server);
    await disconnectDatabase();
  });

  test("creates complaint ticket with unique id", async () => {
    const res = await fetch(`${baseUrl}/api/patient/complaints`, {
      method: "POST",
      headers: {
        Authorization: await authHeaderFor(patientUser),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        category: "service",
        ticketType: "complaint",
        description: "The waiting time was much longer than expected.",
        attachmentUrl: "https://example.com/waiting-room.png",
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.match(body.item.ticketId, /^CMP-\d{8}-/);
    assert.equal(body.item.status, "open");
    assert.equal(body.item.ticketType, "complaint");
    assert.equal(body.item.description, "The waiting time was much longer than expected.");
    assert.match(body.item.subject, /^\[Service\]/);

    const saved = await Complaint.findOne({ ticketId: body.item.ticketId }).lean();
    assert.ok(saved);
    assert.equal(saved.patientUserId.toString(), patientUser._id.toString());
    assert.equal(saved.content, "The waiting time was much longer than expected.");
  });

  test("requires ticket type", async () => {
    const res = await fetch(`${baseUrl}/api/patient/complaints`, {
      method: "POST",
      headers: {
        Authorization: await authHeaderFor(patientUser),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        category: "service",
        description: "A valid complaint description.",
      }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.message, "Ticket type is required");
  });

  test("lists own complaints and filters by status", async () => {
    await Complaint.create({
      ticketId: "CMP-TEST-OPEN",
      patientUserId: patientUser._id,
      category: "billing",
      ticketType: "complaint",
      subject: "[Billing] Open ticket",
      content: "Open billing issue that needs review.",
      status: "open",
      statusUpdatedAt: new Date(),
    });
    await Complaint.create({
      ticketId: "CMP-TEST-RESOLVED",
      patientUserId: patientUser._id,
      category: "service",
      ticketType: "feedback",
      subject: "[Service] Resolved ticket",
      content: "Resolved service feedback already handled.",
      status: "resolved",
      statusUpdatedAt: new Date(),
    });

    const allRes = await fetch(`${baseUrl}/api/patient/complaints`, {
      headers: { Authorization: await authHeaderFor(patientUser) },
    });
    assert.equal(allRes.status, 200);
    const allBody = await allRes.json();
    assert.equal(allBody.total, 2);

    const openRes = await fetch(`${baseUrl}/api/patient/complaints?status=open`, {
      headers: { Authorization: await authHeaderFor(patientUser) },
    });
    assert.equal(openRes.status, 200);
    const openBody = await openRes.json();
    assert.equal(openBody.total, 1);
    assert.equal(openBody.items[0].ticketId, "CMP-TEST-OPEN");
  });

  test("owner views complaint detail with reply thread", async () => {
    const complaint = await Complaint.create({
      ticketId: "CMP-TEST-DETAIL",
      patientUserId: patientUser._id,
      category: "billing",
      ticketType: "complaint",
      subject: "[Billing] Detail ticket",
      content: "Need help with a billing discrepancy.",
      status: "in_progress",
      statusUpdatedAt: new Date(),
    });
    await ComplaintReply.create({
      complaintId: complaint._id,
      repliedBy: patientUser._id,
      content: "Our team is reviewing your billing statement.",
    });

    const res = await fetch(`${baseUrl}/api/patient/complaints/${complaint._id}`, {
      headers: { Authorization: await authHeaderFor(patientUser) },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.complaint.ticketId, "CMP-TEST-DETAIL");
    assert.equal(body.replies.length, 1);
    assert.equal(body.replies[0].content, "Our team is reviewing your billing statement.");
  });

  test("denies access to another patient's complaint", async () => {
    const complaint = await Complaint.create({
      ticketId: "CMP-TEST-PRIVATE",
      patientUserId: patientUser._id,
      category: "billing",
      ticketType: "complaint",
      subject: "[Billing] Private ticket",
      content: "This belongs to the first patient only.",
      status: "open",
      statusUpdatedAt: new Date(),
    });

    const res = await fetch(`${baseUrl}/api/patient/complaints/${complaint._id}`, {
      headers: { Authorization: await authHeaderFor(otherPatientUser) },
    });

    assert.equal(res.status, 403);
  });
});
