import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, beforeEach, describe, test } from "node:test";
import http from "node:http";
import path from "node:path";
import ExcelJS from "exceljs";
import { createApp } from "../app.js";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { AuthToken } from "../models/AuthToken.js";
import { Department } from "../models/Department.js";
import { Doctor } from "../models/Doctor.js";
import { Specialty } from "../models/Specialty.js";
import { User } from "../models/User.js";
import { DOCTOR_IMPORT_HEADERS } from "../services/adminDoctorExcel.service.js";
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

async function buildImportWorkbook(rows) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Import");
  sheet.addRow(DOCTOR_IMPORT_HEADERS);
  rows.forEach((row) => sheet.addRow(DOCTOR_IMPORT_HEADERS.map((header) => row[header] ?? "")));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe("UC-29 Doctor Excel import/export", () => {
  let server;
  let baseUrl;
  let adminUser;
  let specialty;
  let department;

  before(async () => {
    process.env.MONGODB_URI = "memory";
    await connectDatabase();
    server = await listen(createApp());
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  beforeEach(async () => {
    await AuthToken.deleteMany({});
    await Doctor.deleteMany({});
    await Department.deleteMany({});
    await Specialty.deleteMany({});
    await User.deleteMany({});

    adminUser = await User.create({
      email: "admin.doctors.excel@orcaxcare.com",
      passwordHash: "hash",
      role: "admin",
      fullName: "Excel Admin",
      isActive: true,
      isEmailVerified: true,
    });

    specialty = await Specialty.create({
      code: "CARD",
      name: "Cardiology",
      isActive: true,
    });
    department = await Department.create({
      name: "Heart Center",
      isActive: true,
    });

    const doctorUser = await User.create({
      email: "existing.doctor@orcaxcare.com",
      passwordHash: "hash",
      role: "doctor",
      fullName: "Existing Doctor",
      phone: "0901111111",
      isActive: true,
      isEmailVerified: true,
    });
    await Doctor.create({
      userId: doctorUser._id,
      specialtyId: specialty._id,
      departmentId: department._id,
      licenseNo: "DOC-EXIST-001",
      bio: "Senior cardiologist",
      isActive: true,
    });
  });

  after(async () => {
    if (server) await close(server);
    await disconnectDatabase();
  });

  test("exports filtered doctors as xlsx", async () => {
    const res = await fetch(`${baseUrl}/api/admin/doctors/export?q=Existing`, {
      headers: { Authorization: await authHeaderFor(adminUser) },
    });
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") || "", /spreadsheetml/);

    const buffer = Buffer.from(await res.arrayBuffer());
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.worksheets[0];
    assert.equal(cellText(sheet.getRow(1).getCell(1).value), "email");
    assert.equal(cellText(sheet.getRow(2).getCell(2).value), "Existing Doctor");
    assert.equal(cellText(sheet.getRow(2).getCell(5).value), "CARD");
  });

  test("imports valid rows and reports invalid rows", async () => {
    const fileBase64 = (
      await buildImportWorkbook([
        {
          email: "new.doctor@orcaxcare.com",
          fullName: "New Doctor",
          phone: "0902222222",
          licenseNo: "DOC-NEW-001",
          specialtyCode: "CARD",
          departmentName: "Heart Center",
          bio: "Imported doctor",
          password: "ImportPass1",
        },
        {
          email: "bad.doctor@orcaxcare.com",
          fullName: "Bad Doctor",
          phone: "0903333333",
          licenseNo: "DOC-BAD-001",
          specialtyCode: "UNKNOWN",
          departmentName: "Heart Center",
          bio: "",
          password: "ImportPass1",
        },
      ])
    ).toString("base64");

    const res = await fetch(`${baseUrl}/api/admin/doctors/import`, {
      method: "POST",
      headers: {
        Authorization: await authHeaderFor(adminUser),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fileBase64 }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.imported, 1);
    assert.equal(body.failedCount, 1);
    assert.equal(body.succeeded[0].email, "new.doctor@orcaxcare.com");

    const created = await User.findOne({ email: "new.doctor@orcaxcare.com" }).lean();
    assert.ok(created);
    assert.equal(created.role, "doctor");
  });

  test("rejects workbooks with invalid template headers", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Bad");
    sheet.addRow(["email", "name"]);
    sheet.addRow(["x@y.com", "Someone"]);
    const fileBase64 = Buffer.from(await workbook.xlsx.writeBuffer()).toString("base64");

    const res = await fetch(`${baseUrl}/api/admin/doctors/import`, {
      method: "POST",
      headers: {
        Authorization: await authHeaderFor(adminUser),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fileBase64 }),
    });
    assert.equal(res.status, 400);
  });
});

function cellText(value) {
  if (value == null) return "";
  return String(value).trim();
}
