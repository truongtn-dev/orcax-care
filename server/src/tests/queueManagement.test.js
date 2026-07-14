import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, beforeEach, describe, test } from "node:test";
import http from "node:http";
import mongoose from "mongoose";
import path from "node:path";
import { createApp } from "../app.js";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { Appointment } from "../models/Appointment.js";
import { AppointmentSlot } from "../models/AppointmentSlot.js";
import { ClinicRoom } from "../models/ClinicRoom.js";
import { Doctor } from "../models/Doctor.js";
import { Patient } from "../models/Patient.js";
import { QueueSession } from "../models/QueueSession.js";
import { QueueTicket } from "../models/QueueTicket.js";
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

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

async function createDoctor({ email, fullName, licenseNo, departmentId }) {
  const user = await User.create({
    email,
    passwordHash: "hash",
    role: "doctor",
    fullName,
    isActive: true,
    isEmailVerified: true,
  });

  const doctor = await Doctor.create({
    userId: user._id,
    specialtyId: new mongoose.Types.ObjectId(),
    departmentId,
    licenseNo,
    isActive: true,
  });

  return { user, doctor };
}

async function createStaff({ email, fullName }) {
  return User.create({
    email,
    passwordHash: "hash",
    role: "staff",
    fullName,
    isActive: true,
    isEmailVerified: true,
  });
}

async function createPatient({ email, fullName, phone = "0901234567" }) {
  const user = await User.create({
    email,
    passwordHash: "hash",
    role: "patient",
    fullName,
    phone,
    isActive: true,
    isEmailVerified: true,
  });
  await Patient.create({ userId: user._id, isActive: true });
  return user;
}

describe("Queue management", () => {
  let server;
  let baseUrl;
  let departmentId;
  let room;
  let doctorUser;
  let doctor;
  let staffUser;
  let patientUser;
  let appointment;
  let doctorAuth;
  let staffAuth;
  let patientAuth;

  before(async () => {
    await connectDatabase();
    server = await listen(createApp());
    const address = server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    await close(server);
    await disconnectDatabase();
  });

  beforeEach(async () => {
    await Promise.all([
      QueueTicket.deleteMany({}),
      QueueSession.deleteMany({}),
      Appointment.deleteMany({}),
      AppointmentSlot.deleteMany({}),
      ClinicRoom.deleteMany({}),
      Doctor.deleteMany({}),
      Patient.deleteMany({}),
      User.deleteMany({}),
    ]);

    departmentId = new mongoose.Types.ObjectId();
    room = await ClinicRoom.create({
      departmentId,
      roomCode: "Q101",
      roomNumber: "Q-101",
      name: "Queue Room 101",
      isActive: true,
      status: "active",
    });

    ({ user: doctorUser, doctor } = await createDoctor({
      email: "doctor.queue@test.com",
      fullName: "Dr Queue Test",
      licenseNo: "LIC-Q-001",
      departmentId,
    }));

    staffUser = await createStaff({ email: "staff.queue@test.com", fullName: "Staff Queue" });
    patientUser = await createPatient({ email: "patient.queue@test.com", fullName: "Patient Queue" });

    const slot = await AppointmentSlot.create({
      doctorId: doctor._id,
      roomId: room._id,
      workShiftId: new mongoose.Types.ObjectId(),
      date: startOfToday(),
      startTime: "09:00",
      endTime: "09:30",
      status: "booked",
    });

    appointment = await Appointment.create({
      patientUserId: patientUser._id,
      doctorId: doctor._id,
      slotId: slot._id,
      status: "confirmed",
      fee: 200000,
      reason: "Queue demo visit",
    });

    doctorAuth = await authHeaderFor(doctorUser);
    staffAuth = await authHeaderFor(staffUser);
    patientAuth = await authHeaderFor(patientUser);
  });

  test("open session, issue ticket, call next, recall skipped, close session", async () => {
    const openRes = await fetch(`${baseUrl}/api/queue/sessions/open`, {
      method: "POST",
      headers: { Authorization: doctorAuth, "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: room._id.toString() }),
    });
    assert.equal(openRes.status, 201);
    const openBody = await openRes.json();
    const sessionId = openBody.session._id;

    const issueRes = await fetch(`${baseUrl}/api/staff/checkin/${appointment._id}/issue-ticket`, {
      method: "POST",
      headers: { Authorization: staffAuth },
    });
    assert.equal(issueRes.status, 201);
    const issueBody = await issueRes.json();
    assert.equal(issueBody.ticket.number, 1);

    const updatedAppointment = await Appointment.findById(appointment._id).lean();
    assert.equal(updatedAppointment.status, "checked-in");

    const statusRes = await fetch(`${baseUrl}/api/queue/my-status`, {
      headers: { Authorization: patientAuth },
    });
    assert.equal(statusRes.status, 200);
    const statusBody = await statusRes.json();
    assert.equal(statusBody.ticket.number, 1);
    assert.equal(statusBody.peopleAhead, 0);

    const boardRes = await fetch(`${baseUrl}/api/queue/board/${room._id}`);
    assert.equal(boardRes.status, 200);
    const boardBody = await boardRes.json();
    assert.equal(boardBody.nextNumbers[0], 1);
    assert.equal(boardBody.state, "active");

    const sessionBeforeCall = await fetch(`${baseUrl}/api/queue/sessions/${sessionId}`, {
      headers: { Authorization: doctorAuth },
    });
    assert.equal(sessionBeforeCall.status, 200);
    const sessionBeforeCallBody = await sessionBeforeCall.json();
    assert.equal(sessionBeforeCallBody.session.calledTicket, null);

    const callRes = await fetch(`${baseUrl}/api/queue/sessions/${sessionId}/call-next`, {
      method: "POST",
      headers: { Authorization: doctorAuth },
    });
    assert.equal(callRes.status, 200);
    const callBody = await callRes.json();
    assert.equal(callBody.ticket.number, 1);
    assert.equal(callBody.session.calledTicket.number, 1);

    const skipRes = await fetch(`${baseUrl}/api/queue/sessions/${sessionId}/tickets/${issueBody.ticket._id}/skip`, {
      method: "POST",
      headers: { Authorization: doctorAuth },
    });
    assert.equal(skipRes.status, 200);
    const skipBody = await skipRes.json();
    assert.equal(skipBody.session.calledTicket, null);

    const recallRes = await fetch(`${baseUrl}/api/queue/sessions/${sessionId}/recall`, {
      method: "POST",
      headers: { Authorization: doctorAuth },
    });
    assert.equal(recallRes.status, 200);

    const closeRes = await fetch(`${baseUrl}/api/queue/sessions/${sessionId}/close`, {
      method: "POST",
      headers: { Authorization: doctorAuth },
    });
    assert.equal(closeRes.status, 200);
    const closeBody = await closeRes.json();
    assert.equal(closeBody.session.status, "closed");

    const activeAfterClose = await fetch(`${baseUrl}/api/queue/sessions/me`, {
      headers: { Authorization: doctorAuth },
    });
    assert.equal(activeAfterClose.status, 404);
  });

  test("issue ticket fails when session is not open", async () => {
    const issueRes = await fetch(`${baseUrl}/api/staff/checkin/${appointment._id}/issue-ticket`, {
      method: "POST",
      headers: { Authorization: staffAuth },
    });
    assert.equal(issueRes.status, 409);
  });
});
