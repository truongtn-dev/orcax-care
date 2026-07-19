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
import { AuthToken } from "../models/AuthToken.js";
import { Doctor } from "../models/Doctor.js";
import { Patient } from "../models/Patient.js";
import { User } from "../models/User.js";
import { issueAuthToken } from "../services/token.service.js";
import { formatDateOnly, startOfToday } from "../utils/shiftTime.js";

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

describe("UC-31 Admin Dashboard", () => {
  let server;
  let baseUrl;
  let adminUser;
  let doctor;
  let patientUser;
  let todaySlot;
  let tomorrowSlot;

  before(async () => {
    process.env.MONGODB_URI = "memory";
    await connectDatabase();
    server = await listen(createApp());
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  beforeEach(async () => {
    await AuthToken.deleteMany({});
    await Appointment.deleteMany({});
    await AppointmentSlot.deleteMany({});
    await Patient.deleteMany({});
    await Doctor.deleteMany({});
    await User.deleteMany({});

    adminUser = await User.create({
      email: "admin.dashboard@orcaxcare.com",
      passwordHash: "hash",
      role: "admin",
      fullName: "Dashboard Admin",
      isActive: true,
      isEmailVerified: true,
    });

    patientUser = await User.create({
      email: "patient.dashboard@orcaxcare.com",
      passwordHash: "hash",
      role: "patient",
      fullName: "Dashboard Patient",
      isActive: true,
      isEmailVerified: true,
    });
    await Patient.create({ userId: patientUser._id, isActive: true });

    const doctorUser = await User.create({
      email: "doctor.dashboard@orcaxcare.com",
      passwordHash: "hash",
      role: "doctor",
      fullName: "Dashboard Doctor",
      isActive: true,
      isEmailVerified: true,
    });

    doctor = await Doctor.create({
      userId: doctorUser._id,
      specialtyId: new mongoose.Types.ObjectId(),
      departmentId: new mongoose.Types.ObjectId(),
      licenseNo: "DOC-DASH-001",
      isActive: true,
    });

    const today = startOfToday();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    todaySlot = await AppointmentSlot.create({
      doctorId: doctor._id,
      workShiftId: new mongoose.Types.ObjectId(),
      date: today,
      startTime: "09:00",
      endTime: "09:30",
      status: "booked",
    });

    tomorrowSlot = await AppointmentSlot.create({
      doctorId: doctor._id,
      workShiftId: new mongoose.Types.ObjectId(),
      date: tomorrow,
      startTime: "10:00",
      endTime: "10:30",
      status: "booked",
    });

    const extraTodaySlot = await AppointmentSlot.create({
      doctorId: doctor._id,
      workShiftId: new mongoose.Types.ObjectId(),
      date: today,
      startTime: "10:00",
      endTime: "10:30",
      status: "booked",
    });

    await Appointment.create([
      {
        patientUserId: patientUser._id,
        doctorId: doctor._id,
        slotId: todaySlot._id,
        fee: 200000,
        status: "confirmed",
      },
      {
        patientUserId: patientUser._id,
        doctorId: doctor._id,
        slotId: extraTodaySlot._id,
        fee: 300000,
        status: "completed",
      },
      {
        patientUserId: patientUser._id,
        doctorId: doctor._id,
        slotId: tomorrowSlot._id,
        fee: 150000,
        status: "confirmed",
      },
    ]);
  });

  after(async () => {
    if (server) await close(server);
    await disconnectDatabase();
  });

  test("returns today's appointment counts for admin dashboard", async () => {
    const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
      headers: { Authorization: await authHeaderFor(adminUser) },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.date, formatDateOnly(startOfToday()));
    assert.equal(body.appointmentsToday.total, 2);
    assert.equal(body.appointmentsToday.confirmed, 1);
    assert.equal(body.appointmentsToday.completed, 1);
    assert.equal(body.appointmentsToday.cancelled, 0);
  });

  test("returns period KPIs and revenue chart", async () => {
    const from = formatDateOnly(startOfToday());
    const res = await fetch(`${baseUrl}/api/admin/dashboard?from=${from}&to=${from}`, {
      headers: { Authorization: await authHeaderFor(adminUser) },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.kpis.totalRevenue, 500000);
    assert.equal(body.kpis.appointmentCount, 2);
    assert.equal(body.kpis.newPatients, 1);
    assert.equal(body.kpis.activeDoctors, 1);
    assert.equal(body.revenueChart.length, 1);
    assert.equal(body.revenueChart[0].revenue, 500000);
    assert.equal(body.revenueChart[0].appointments, 2);
  });

  test("filters revenue KPIs by doctor", async () => {
    const otherDoctorUser = await User.create({
      email: "other.doctor.dashboard@orcaxcare.com",
      passwordHash: "hash",
      role: "doctor",
      fullName: "Other Doctor",
      isActive: true,
      isEmailVerified: true,
    });
    const otherDoctor = await Doctor.create({
      userId: otherDoctorUser._id,
      specialtyId: new mongoose.Types.ObjectId(),
      departmentId: new mongoose.Types.ObjectId(),
      licenseNo: "DOC-DASH-002",
      isActive: true,
    });

    const from = formatDateOnly(startOfToday());
    const res = await fetch(
      `${baseUrl}/api/admin/dashboard?from=${from}&to=${from}&doctorId=${otherDoctor._id}`,
      { headers: { Authorization: await authHeaderFor(adminUser) } }
    );
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.kpis.totalRevenue, 0);
    assert.equal(body.kpis.appointmentCount, 0);
    assert.equal(body.appointmentsToday.total, 0);
  });

  test("groups revenue chart by week", async () => {
    const from = formatDateOnly(startOfToday());
    const toDate = new Date(startOfToday());
    toDate.setDate(toDate.getDate() + 1);
    const to = formatDateOnly(toDate);

    const res = await fetch(`${baseUrl}/api/admin/dashboard?from=${from}&to=${to}&groupBy=week`, {
      headers: { Authorization: await authHeaderFor(adminUser) },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.period.groupBy, "week");
    assert.ok(body.revenueChart.length > 0);
    assert.ok(body.revenueChart.every((point) => point.label.startsWith("Wk of ")));
    const totalFromChart = body.revenueChart.reduce((sum, point) => sum + point.revenue, 0);
    assert.equal(totalFromChart, body.kpis.totalRevenue);
  });

  test("groups revenue chart by month", async () => {
    const from = formatDateOnly(startOfToday());
    const toDate = new Date(startOfToday());
    toDate.setDate(toDate.getDate() + 1);
    const to = formatDateOnly(toDate);

    const res = await fetch(`${baseUrl}/api/admin/dashboard?from=${from}&to=${to}&groupBy=month`, {
      headers: { Authorization: await authHeaderFor(adminUser) },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.period.groupBy, "month");
    assert.ok(body.revenueChart.length > 0);
    assert.ok(body.revenueChart.every((point) => /^[A-Za-z]{3} \d{4}$/.test(point.label)));
    const totalFromChart = body.revenueChart.reduce((sum, point) => sum + point.revenue, 0);
    assert.equal(totalFromChart, body.kpis.totalRevenue);
  });

  test("rejects invalid groupBy", async () => {
    const res = await fetch(`${baseUrl}/api/admin/dashboard?groupBy=year`, {
      headers: { Authorization: await authHeaderFor(adminUser) },
    });
    assert.equal(res.status, 400);
  });

  test("rejects invalid date filters", async () => {
    const res = await fetch(`${baseUrl}/api/admin/dashboard?from=bad-date`, {
      headers: { Authorization: await authHeaderFor(adminUser) },
    });
    assert.equal(res.status, 400);
  });

  test("requires admin role", async () => {
    const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
      headers: { Authorization: await authHeaderFor(patientUser) },
    });
    assert.equal(res.status, 403);
  });
});
