import mongoose from "mongoose";
import { Doctor } from "../models/Doctor.js";
import { Encounter } from "../models/Encounter.js";
import { Medicine } from "../models/Medicine.js";
import { Prescription } from "../models/Prescription.js";

async function resolveDoctorForUser(userId) {
  const doctor = await Doctor.findOne({ userId, isActive: true }).lean();
  return doctor || null;
}

function serializeLineItem(item) {
  return {
    medicineId: item.medicineId?.toString() || "",
    medicineName: item.medicineName || "",
    medicineCode: item.medicineCode || "",
    unit: item.unit || "",
    quantity: item.quantity || 0,
    durationDays: item.durationDays || 0,
    dosage: item.dosage || "",
    instructions: item.instructions || "",
    unitPrice: item.unitPrice || 0,
    lineTotal: item.lineTotal || 0,
    stockSnapshot: item.stockSnapshot || 0,
    stockWarning: Boolean(item.stockWarning),
  };
}

function serializePrescription(row) {
  return {
    _id: row._id.toString(),
    encounterId: row.encounterId.toString(),
    patientUserId: row.patientUserId.toString(),
    doctorId: row.doctorId.toString(),
    status: row.status,
    notes: row.notes || "",
    lineItems: (row.lineItems || []).map(serializeLineItem),
    totalAmount: row.totalAmount || 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function parsePositiveInt(value, fallback = null) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return parsed;
}

export async function listMedicines({ q = "" } = {}) {
  const filter = { isActive: true };
  const search = String(q || "").trim();
  if (search) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: regex }, { code: regex }];
  }

  const medicines = await Medicine.find(filter).sort({ name: 1 }).limit(50).lean();
  return {
    status: 200,
    body: {
      items: medicines.map((medicine) => ({
        _id: medicine._id.toString(),
        name: medicine.name,
        code: medicine.code,
        unit: medicine.unit,
        price: medicine.price,
        stockQty: medicine.stockQty,
        minStockLevel: medicine.minStockLevel,
      })),
    },
  };
}

export async function createPrescription(userId, encounterId, payload = {}) {
  const doctor = await resolveDoctorForUser(userId);
  if (!doctor) {
    return { status: 404, body: { message: "Doctor profile not found" } };
  }
  if (!encounterId || !mongoose.Types.ObjectId.isValid(encounterId)) {
    return { status: 400, body: { message: "Invalid encounter" } };
  }

  const encounter = await Encounter.findOne({ _id: encounterId, doctorId: doctor._id }).lean();
  if (!encounter) {
    return { status: 404, body: { message: "Encounter not found" } };
  }
  if (encounter.status === "signed") {
    return { status: 409, body: { message: "Encounter is signed off" } };
  }

  const requestedItems = Array.isArray(payload.lineItems) ? payload.lineItems : [];
  if (requestedItems.length === 0) {
    return { status: 400, body: { message: "At least one prescription line item is required" } };
  }

  const medicineIds = [...new Set(requestedItems.map((item) => String(item.medicineId || "")))];
  if (medicineIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
    return { status: 400, body: { message: "Valid medicine is required" } };
  }

  const medicines = await Medicine.find({ _id: { $in: medicineIds }, isActive: true }).lean();
  const medicineById = new Map(medicines.map((medicine) => [medicine._id.toString(), medicine]));
  const lineItems = [];
  const seenMedicineIds = new Set();

  for (const item of requestedItems) {
    const medicineId = String(item.medicineId || "");
    const medicine = medicineById.get(medicineId);
    if (!medicine) {
      return { status: 404, body: { message: "Medicine not found" } };
    }
    if (seenMedicineIds.has(medicineId)) {
      return { status: 409, body: { message: "Duplicate medicine line item" } };
    }
    seenMedicineIds.add(medicineId);

    const quantity = parsePositiveInt(item.quantity);
    const durationDays = parsePositiveInt(item.durationDays, 1);
    if (!quantity) {
      return { status: 400, body: { message: "Quantity must be at least 1" } };
    }

    const unitPrice = medicine.price || 0;
    const lineTotal = unitPrice * quantity;
    lineItems.push({
      medicineId: medicine._id,
      medicineName: medicine.name,
      medicineCode: medicine.code,
      unit: medicine.unit,
      quantity,
      durationDays,
      dosage: String(item.dosage || "").trim(),
      instructions: String(item.instructions || "").trim(),
      unitPrice,
      lineTotal,
      stockSnapshot: medicine.stockQty || 0,
      stockWarning: quantity > (medicine.stockQty || 0),
    });
  }

  const totalAmount = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const prescription = await Prescription.create({
    encounterId: encounter._id,
    patientUserId: encounter.patientUserId,
    doctorId: doctor._id,
    status: "draft",
    notes: String(payload.notes || "").trim(),
    lineItems,
    totalAmount,
    createdBy: userId,
  });

  return { status: 201, body: serializePrescription(prescription.toObject()) };
}
