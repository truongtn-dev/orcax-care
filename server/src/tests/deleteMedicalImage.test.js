import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, beforeEach, describe, test } from "node:test";
import http from "node:http";
import mongoose from "mongoose";
import path from "node:path";
import { createApp } from "../app.js";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { AuthToken } from "../models/AuthToken.js";
import { Appointment } from "../models/Appointment.js";
import { AppointmentSlot } from "../models/AppointmentSlot.js";
import { ClinicRoom } from "../models/ClinicRoom.js";
import { Doctor } from "../models/Doctor.js";
import { Encounter } from "../models/Encounter.js";
import { MedicalImage } from "../models/MedicalImage.js";
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

async function createDoctor({ email, fullName, licenseNo }) {
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
    departmentId: new mongoose.Types.ObjectId(),
    licenseNo,
    isActive: true,
  });
  return { user, doctor };
}

async function createPatient() {
  const user = await User.create({
    email: "image.patient@orcaxcare.com",
    passwordHash: "hash",
    role: "patient",
    fullName: "Image Patient",
    isActive: true,
    isEmailVerified: true,
  });
  await Patient.create({ userId: user._id, isActive: true });
  return user;
}

async function createEncounter({ patientUserId, doctorId, status = "draft" }) {
  const room = await ClinicRoom.create({
    name: "Imaging Room",
    roomCode: "IMG101",
    roomNumber: "IMG-101",
    capacity: 1,
  });
  const slot = await AppointmentSlot.create({
    doctorId,
    roomId: room._id,
    workShiftId: new mongoose.Types.ObjectId(),
    date: new Date("2026-06-21T00:00:00.000Z"),
    startTime: "10:00",
    endTime: "10:30",
    status: "booked",
  });
  const appointment = await Appointment.create({
    patientUserId,
    doctorId,
    slotId: slot._id,
    status: "completed",
    reason: "Imaging review",
    fee: 200000,
  });
  return Encounter.create({
    patientUserId,
    doctorId,
    appointmentId: appointment._id,
    visitDate: new Date("2026-06-21T10:00:00.000Z"),
    chiefComplaint: "Review diagnostic image",
    clinicalNotes: "Image attached for review",
    diagnoses: [{ code: "R93", text: "Abnormal diagnostic imaging finding" }],
    status,
    signedOffAt: status === "signed" ? new Date("2026-06-21T11:00:00.000Z") : null,
  });
}

describe("UC-23.1.2 Delete Medical Image", () => {
  let server;
  let baseUrl;
  let doctorUser;
  let otherDoctorUser;
  let doctor;
  let patientUser;
  let encounter;
  let image;

  before(async () => {
    process.env.MONGODB_URI = "memory";
    await connectDatabase();
    server = await listen(createApp());
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  beforeEach(async () => {
    await AuthToken.deleteMany({});
    await MedicalImage.deleteMany({});
    await Encounter.deleteMany({});
    await Appointment.deleteMany({});
    await AppointmentSlot.deleteMany({});
    await ClinicRoom.deleteMany({});
    await Doctor.deleteMany({});
    await Patient.deleteMany({});
    await User.deleteMany({});

    const ownDoctor = await createDoctor({
      email: "image.doctor@orcaxcare.com",
      fullName: "Dr. Image",
      licenseNo: "IMG-001",
    });
    doctorUser = ownDoctor.user;
    doctor = ownDoctor.doctor;
    otherDoctorUser = (
      await createDoctor({
        email: "image.other@orcaxcare.com",
        fullName: "Dr. Other Image",
        licenseNo: "IMG-002",
      })
    ).user;
    patientUser = await createPatient();
    encounter = await createEncounter({ patientUserId: patientUser._id, doctorId: doctor._id });
    image = await MedicalImage.create({
      encounterId: encounter._id,
      patientUserId: patientUser._id,
      uploadedBy: doctorUser._id,
      type: "xray",
      title: "Chest X-ray",
      url: "https://example.com/chest-xray.png",
      thumbnailUrl: "https://example.com/chest-xray-thumb.png",
      mimeType: "image/png",
      sizeBytes: 2048,
    });
  });

  after(async () => {
    if (server) await close(server);
    await disconnectDatabase();
  });

  test("doctor soft-deletes own encounter image and hides it from encounter detail", async () => {
    const beforeRes = await fetch(`${baseUrl}/api/doctor/encounters/${encounter._id}`, {
      headers: { Authorization: await authHeaderFor(doctorUser) },
    });
    assert.equal(beforeRes.status, 200);
    const before = await beforeRes.json();
    assert.equal(before.images.length, 1);
    assert.equal(before.images[0]._id, image._id.toString());

    const deleteRes = await fetch(`${baseUrl}/api/doctor/medical-images/${image._id}`, {
      method: "DELETE",
      headers: { Authorization: await authHeaderFor(doctorUser) },
    });

    assert.equal(deleteRes.status, 200);
    assert.deepEqual(await deleteRes.json(), { message: "Medical image deleted" });

    const stored = await MedicalImage.findById(image._id).lean();
    assert.ok(stored.deletedAt instanceof Date);
    assert.equal(stored.deletedBy.toString(), doctorUser._id.toString());

    const afterRes = await fetch(`${baseUrl}/api/doctor/encounters/${encounter._id}`, {
      headers: { Authorization: await authHeaderFor(doctorUser) },
    });
    assert.equal(afterRes.status, 200);
    const after = await afterRes.json();
    assert.equal(after.images.length, 0);
  });

  test("another doctor cannot delete the image", async () => {
    const res = await fetch(`${baseUrl}/api/doctor/medical-images/${image._id}`, {
      method: "DELETE",
      headers: { Authorization: await authHeaderFor(otherDoctorUser) },
    });

    assert.equal(res.status, 404);
    const stored = await MedicalImage.findById(image._id).lean();
    assert.equal(stored.deletedAt, null);
  });

  test("signed encounter image cannot be deleted", async () => {
    encounter.status = "signed";
    encounter.signedOffAt = new Date();
    encounter.signedOffBy = doctorUser._id;
    await encounter.save();

    const res = await fetch(`${baseUrl}/api/doctor/medical-images/${image._id}`, {
      method: "DELETE",
      headers: { Authorization: await authHeaderFor(doctorUser) },
    });

    assert.equal(res.status, 409);
    assert.deepEqual(await res.json(), { message: "Encounter is signed off" });
  });
});
