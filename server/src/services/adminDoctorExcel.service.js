import crypto from "node:crypto";
import ExcelJS from "exceljs";
import { Department } from "../models/Department.js";
import { Specialty } from "../models/Specialty.js";
import { createStaffAccount } from "./admin.service.js";
import { queryFilteredDoctors } from "./adminDoctor.service.js";
import { invalidateSearchCache } from "./doctorSearch.service.js";
import { formatDateOnly } from "../utils/shiftTime.js";

export const DOCTOR_IMPORT_HEADERS = [
  "email",
  "fullName",
  "phone",
  "licenseNo",
  "specialtyCode",
  "departmentName",
  "bio",
  "password",
];

const CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function headersMatch(actualHeaders) {
  if (actualHeaders.length !== DOCTOR_IMPORT_HEADERS.length) return false;
  return actualHeaders.every((header, index) => header === normalizeHeader(DOCTOR_IMPORT_HEADERS[index]));
}

function cellText(value) {
  if (value == null) return "";
  if (typeof value === "object" && value.text) return String(value.text).trim();
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

function generateTempPassword() {
  return `Orca${crypto.randomBytes(4).toString("hex")}9`;
}

async function buildWorkbook(rows, sheetName = "Doctors") {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = DOCTOR_IMPORT_HEADERS.map((header) => ({
    header,
    key: header,
    width: header === "bio" ? 36 : 18,
  }));
  sheet.getRow(1).font = { bold: true };
  rows.forEach((row) => sheet.addRow(row));
  return workbook;
}

function doctorExportRow(doctor) {
  return {
    email: doctor.email,
    fullName: doctor.fullName,
    phone: doctor.phone || "",
    licenseNo: doctor.licenseNo,
    specialtyCode: doctor.specialty?.code || "",
    departmentName: doctor.departmentName || "",
    bio: doctor.bio || "",
    password: "",
  };
}

export async function exportDoctors(filters = {}) {
  const items = await queryFilteredDoctors(filters);
  const workbook = await buildWorkbook(items.map(doctorExportRow));
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const stamp = formatDateOnly(new Date());

  return {
    status: 200,
    buffer,
    contentType: CONTENT_TYPE,
    contentDisposition: `attachment; filename="doctors-export-${stamp}.xlsx"`,
  };
}

export async function downloadImportTemplate() {
  const workbook = await buildWorkbook([
    {
      email: "doctor@orcaxcare.com",
      fullName: "Example Doctor",
      phone: "0901234567",
      licenseNo: "DOC-001",
      specialtyCode: "CARD",
      departmentName: "Cardiology",
      bio: "Optional biography",
      password: "ChangeMe1",
    },
  ], "DoctorImportTemplate");
  const sheet = workbook.getWorksheet("DoctorImportTemplate");
  sheet.getRow(2).font = { italic: true, color: { argb: "FF64748B" } };

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return {
    status: 200,
    buffer,
    contentType: CONTENT_TYPE,
    contentDisposition: 'attachment; filename="doctor-import-template.xlsx"',
  };
}

async function loadImportLookups() {
  const [specialties, departments] = await Promise.all([
    Specialty.find({ isActive: true }).lean(),
    Department.find({ isActive: true }).lean(),
  ]);

  const specialtyByCode = new Map(
    specialties.map((item) => [String(item.code || "").trim().toUpperCase(), item])
  );
  const departmentByName = new Map(
    departments.map((item) => [String(item.name || "").trim().toLowerCase(), item])
  );

  return { specialtyByCode, departmentByName };
}

function parseWorksheetRows(worksheet) {
  const headerRow = worksheet.getRow(1);
  const actualHeaders = DOCTOR_IMPORT_HEADERS.map((_, index) =>
    normalizeHeader(cellText(headerRow.getCell(index + 1).value))
  );

  if (!headersMatch(actualHeaders)) {
    return {
      error: {
        status: 400,
        body: {
          message: "Invalid import template. Use the provided doctor import template headers.",
          expectedHeaders: DOCTOR_IMPORT_HEADERS,
        },
      },
    };
  }

  const rows = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = DOCTOR_IMPORT_HEADERS.map((_, index) => cellText(row.getCell(index + 1).value));
    if (values.every((value) => !value)) return;
    rows.push({ rowNumber, values: Object.fromEntries(DOCTOR_IMPORT_HEADERS.map((key, index) => [key, values[index]])) });
  });

  return { rows };
}

export async function importDoctors(payload = {}) {
  const fileBase64 = String(payload.fileBase64 || "").trim();
  if (!fileBase64) {
    return { status: 400, body: { message: "fileBase64 is required" } };
  }

  let buffer;
  try {
    buffer = Buffer.from(fileBase64, "base64");
  } catch {
    return { status: 400, body: { message: "Could not read the uploaded file" } };
  }

  if (!buffer.length) {
    return { status: 400, body: { message: "Uploaded file is empty" } };
  }

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch {
    return { status: 400, body: { message: "File must be a valid .xlsx workbook" } };
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return { status: 400, body: { message: "Workbook must contain at least one worksheet" } };
  }

  const parsed = parseWorksheetRows(worksheet);
  if (parsed.error) return parsed.error;

  const { specialtyByCode, departmentByName } = await loadImportLookups();
  const succeeded = [];
  const failed = [];

  for (const row of parsed.rows) {
    const data = row.values;
    const specialtyCode = String(data.specialtyCode || "").trim().toUpperCase();
    const departmentName = String(data.departmentName || "").trim().toLowerCase();
    const specialty = specialtyByCode.get(specialtyCode);
    const department = departmentByName.get(departmentName);
    const password = String(data.password || "").trim() || generateTempPassword();

    if (!specialty) {
      failed.push({ row: row.rowNumber, email: data.email, message: `Unknown specialty code "${data.specialtyCode}"` });
      continue;
    }
    if (!department) {
      failed.push({
        row: row.rowNumber,
        email: data.email,
        message: `Unknown department "${data.departmentName}"`,
      });
      continue;
    }

    const result = await createStaffAccount({
      role: "doctor",
      email: data.email,
      password,
      fullName: data.fullName,
      phone: data.phone,
      licenseNo: data.licenseNo,
      specialtyId: specialty._id.toString(),
      departmentId: department._id.toString(),
      bio: data.bio,
    });

    if (result.status >= 400) {
      failed.push({
        row: row.rowNumber,
        email: data.email,
        message: result.body?.message || "Import failed",
      });
      continue;
    }

    succeeded.push({
      row: row.rowNumber,
      email: data.email,
      fullName: data.fullName,
      generatedPassword: String(data.password || "").trim() ? null : password,
    });
  }

  if (succeeded.length) {
    invalidateSearchCache();
  }

  return {
    status: 200,
    body: {
      imported: succeeded.length,
      failedCount: failed.length,
      succeeded,
      failed,
    },
  };
}
