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
    _id: item._id?.toString() || "",
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

function serializeUser(user) {
  if (!user) return null;
  return {
    userId: user._id?.toString() || "",
    fullName: user.fullName || "",
    email: user.email || "",
    phone: user.phone || "",
  };
}

function serializeDoctorProfile(doctor) {
  if (!doctor) return null;
  return {
    _id: doctor._id?.toString() || "",
    fullName: doctor.userId?.fullName || "",
    email: doctor.userId?.email || "",
    licenseNo: doctor.licenseNo || "",
  };
}

function serializeEncounterSummary(encounter) {
  if (!encounter) return null;
  return {
    _id: encounter._id?.toString() || "",
    visitDate: encounter.visitDate,
    status: encounter.status,
    chiefComplaint: encounter.chiefComplaint || "",
    diagnoses: (encounter.diagnoses || []).map((diagnosis) => ({
      code: diagnosis.code || "",
      text: diagnosis.text || "",
      note: diagnosis.note || "",
    })),
  };
}

function serializePrescriptionDetail(row) {
  return {
    ...serializePrescription(row),
    patient: serializeUser(row.patientUserId),
    doctor: serializeDoctorProfile(row.doctorId),
    encounter: serializeEncounterSummary(row.encounterId),
  };
}

function populatePrescriptionDetail(query) {
  return query
    .populate("patientUserId", "fullName email phone")
    .populate({
      path: "doctorId",
      select: "userId licenseNo",
      populate: { path: "userId", select: "fullName email" },
    })
    .populate("encounterId", "visitDate status chiefComplaint diagnoses");
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

export async function getDoctorPrescription(userId, prescriptionId) {
  const doctor = await resolveDoctorForUser(userId);
  if (!doctor) {
    return { status: 404, body: { message: "Doctor profile not found" } };
  }
  if (!prescriptionId || !mongoose.Types.ObjectId.isValid(prescriptionId)) {
    return { status: 400, body: { message: "Invalid prescription" } };
  }

  const prescription = await populatePrescriptionDetail(
    Prescription.findOne({ _id: prescriptionId, doctorId: doctor._id })
  ).lean();
  if (!prescription) {
    return { status: 404, body: { message: "Prescription not found" } };
  }

  return { status: 200, body: serializePrescriptionDetail(prescription) };
}

export async function getPatientPrescription(userId, prescriptionId) {
  if (!prescriptionId || !mongoose.Types.ObjectId.isValid(prescriptionId)) {
    return { status: 400, body: { message: "Invalid prescription" } };
  }

  const prescription = await populatePrescriptionDetail(
    Prescription.findOne({ _id: prescriptionId, patientUserId: userId })
  ).lean();
  if (!prescription) {
    return { status: 404, body: { message: "Prescription not found" } };
  }

  return { status: 200, body: serializePrescriptionDetail(prescription) };
}

export async function removeLineItem(userId, prescriptionId, itemId) {
  const doctor = await resolveDoctorForUser(userId);
  if (!doctor) {
    return { status: 404, body: { message: "Doctor profile not found" } };
  }
  if (!prescriptionId || !mongoose.Types.ObjectId.isValid(prescriptionId)) {
    return { status: 400, body: { message: "Invalid prescription" } };
  }

  const prescription = await Prescription.findOne({ _id: prescriptionId, doctorId: doctor._id });
  if (!prescription) {
    return { status: 404, body: { message: "Prescription not found" } };
  }
  if (prescription.status !== "draft") {
    return { status: 409, body: { message: "Only draft prescriptions can be modified" } };
  }

  const initialCount = prescription.lineItems.length;
  prescription.lineItems = prescription.lineItems.filter(item => item.medicineId.toString() !== itemId);

  if (prescription.lineItems.length === initialCount) {
    return { status: 404, body: { message: "Line item not found" } };
  }

  prescription.totalAmount = prescription.lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  await prescription.save();

  const updated = await populatePrescriptionDetail(Prescription.findById(prescription._id)).lean();
  return { status: 200, body: serializePrescriptionDetail(updated) };
}
