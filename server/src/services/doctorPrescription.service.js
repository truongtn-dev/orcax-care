import mongoose from "mongoose";
import { Doctor } from "../models/Doctor.js";
import { Encounter } from "../models/Encounter.js";
import { Medicine } from "../models/Medicine.js";
import { Prescription } from "../models/Prescription.js";
import { User } from "../models/User.js";

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

export async function listDoctorPrescriptions(userId, query = {}) {
  const doctor = await resolveDoctorForUser(userId);
  if (!doctor) {
    return { status: 404, body: { message: "Doctor profile not found" } };
  }

  const page = parsePositiveInt(query.page, 1);
  const pageSize = parsePositiveInt(query.pageSize, 10);
  const skip = (page - 1) * pageSize;

  const filter = { doctorId: doctor._id };

  if (query.status) {
    filter.status = query.status;
  }

  if (query.startDate || query.endDate) {
    filter.createdAt = {};
    if (query.startDate) {
      filter.createdAt.$gte = new Date(query.startDate);
    }
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  if (query.keyword && String(query.keyword).trim()) {
    const search = String(query.keyword).trim();
    const matchingUsers = await User.find({
      role: "patient",
      fullName: new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
    })
      .select("_id")
      .lean();
    const patientUserIds = matchingUsers.map((u) => u._id);

    const orFilters = [{ patientUserId: { $in: patientUserIds } }];
    if (mongoose.Types.ObjectId.isValid(search)) {
      orFilters.push({ encounterId: search });
    }
    filter.$or = orFilters;
  }

  const sortDir = query.sort === "oldest" ? 1 : -1;
  const sort = { createdAt: sortDir };

  const total = await Prescription.countDocuments(filter);
  const prescriptions = await Prescription.find(filter)
    .populate("patientUserId", "fullName email phone")
    .populate("encounterId", "visitDate status chiefComplaint diagnoses")
    .sort(sort)
    .skip(skip)
    .limit(pageSize)
    .lean();

  return {
    status: 200,
    body: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      items: prescriptions.map((p) => {
        const lineItemCount = p.lineItems?.length || 0;
        return {
          _id: p._id.toString(),
          encounterId: p.encounterId?._id?.toString() || p.encounterId?.toString() || "",
          patientName: p.patientUserId?.fullName || "N/A",
          patientMRN: p.patientUserId?._id?.toString() || "",
          createdAt: p.createdAt,
          status: p.status,
          totalMedications: lineItemCount,
        };
      }),
    },
  };
}

export async function listPatientPrescriptions(userId, query = {}) {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return { status: 400, body: { message: "Invalid patient" } };
  }

  const page = parsePositiveInt(query.page, 1);
  const pageSize = Math.min(50, parsePositiveInt(query.pageSize, 10) || 10);
  const skip = (page - 1) * pageSize;

  const filter = { patientUserId: userId };
  if (query.status && query.status !== "all") {
    filter.status = String(query.status);
  }

  const sortDir = query.sort === "oldest" ? 1 : -1;
  const total = await Prescription.countDocuments(filter);
  const prescriptions = await Prescription.find(filter)
    .populate({
      path: "doctorId",
      select: "userId licenseNo",
      populate: { path: "userId", select: "fullName" },
    })
    .populate("encounterId", "visitDate chiefComplaint")
    .sort({ createdAt: sortDir })
    .skip(skip)
    .limit(pageSize)
    .lean();

  return {
    status: 200,
    body: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
      items: prescriptions.map((p) => ({
        _id: p._id.toString(),
        status: p.status,
        totalAmount: p.totalAmount || 0,
        totalMedications: p.lineItems?.length || 0,
        createdAt: p.createdAt,
        doctorName: p.doctorId?.userId?.fullName || "Doctor",
        encounterId: p.encounterId?._id?.toString() || p.encounterId?.toString() || "",
        visitDate: p.encounterId?.visitDate || null,
        chiefComplaint: p.encounterId?.chiefComplaint || "",
      })),
    },
  };
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

export async function addLineItem(userId, prescriptionId, itemPayload = {}) {
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

  const encounter = await Encounter.findById(prescription.encounterId).select("status").lean();
  if (encounter?.status === "signed") {
    return { status: 409, body: { message: "Encounter is already signed off and cannot be edited" } };
  }

  const medicineId = String(itemPayload.medicineId || "");
  if (!medicineId || !mongoose.Types.ObjectId.isValid(medicineId)) {
    return { status: 400, body: { message: "Valid medicine is required" } };
  }

  if (prescription.lineItems.some((item) => item.medicineId.toString() === medicineId)) {
    return { status: 409, body: { message: "Duplicate medicine line item" } };
  }

  const medicine = await Medicine.findOne({ _id: medicineId, isActive: true }).lean();
  if (!medicine) {
    return { status: 404, body: { message: "Medicine not found" } };
  }

  const quantity = parsePositiveInt(itemPayload.quantity);
  const durationDays = parsePositiveInt(itemPayload.durationDays, 1);
  if (!quantity) {
    return { status: 400, body: { message: "Quantity must be at least 1" } };
  }

  const dosage = String(itemPayload.dosage || "").trim();
  if (!dosage) {
    return { status: 400, body: { message: "Dosage is required" } };
  }

  const unitPrice = medicine.price || 0;
  prescription.lineItems.push({
    medicineId: medicine._id,
    medicineName: medicine.name,
    medicineCode: medicine.code,
    unit: medicine.unit,
    quantity,
    durationDays: durationDays || 1,
    dosage,
    instructions: String(itemPayload.instructions || "").trim(),
    unitPrice,
    lineTotal: unitPrice * quantity,
    stockSnapshot: medicine.stockQty || 0,
    stockWarning: quantity > (medicine.stockQty || 0),
  });

  prescription.totalAmount = prescription.lineItems.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
  await prescription.save();

  const updated = await populatePrescriptionDetail(Prescription.findById(prescription._id)).lean();
  return { status: 200, body: serializePrescriptionDetail(updated) };
}

export async function updateLineItem(userId, prescriptionId, itemId, itemPayload = {}) {
  const doctor = await resolveDoctorForUser(userId);
  if (!doctor) {
    return { status: 404, body: { message: "Doctor profile not found" } };
  }
  if (!prescriptionId || !mongoose.Types.ObjectId.isValid(prescriptionId)) {
    return { status: 400, body: { message: "Invalid prescription" } };
  }
  if (!itemId) {
    return { status: 400, body: { message: "Invalid line item" } };
  }

  const prescription = await Prescription.findOne({ _id: prescriptionId, doctorId: doctor._id });
  if (!prescription) {
    return { status: 404, body: { message: "Prescription not found" } };
  }
  if (prescription.status !== "draft") {
    return { status: 409, body: { message: "Only draft prescriptions can be modified" } };
  }

  const encounter = await Encounter.findById(prescription.encounterId).select("status").lean();
  if (encounter?.status === "signed") {
    return { status: 409, body: { message: "Encounter is already signed off and cannot be edited" } };
  }

  const lineItem = prescription.lineItems.find((item) => item.medicineId.toString() === String(itemId));
  if (!lineItem) {
    return { status: 404, body: { message: "Line item not found" } };
  }

  const { quantity, durationDays, dosage, instructions } = itemPayload;

  if (quantity !== undefined) {
    const parsedQty = parsePositiveInt(quantity);
    if (!parsedQty) {
      return { status: 400, body: { message: "Quantity must be at least 1" } };
    }
    lineItem.quantity = parsedQty;
    lineItem.lineTotal = (lineItem.unitPrice || 0) * parsedQty;
    lineItem.stockWarning = parsedQty > (lineItem.stockSnapshot || 0);
  }

  if (durationDays !== undefined) {
    const parsedDuration = parsePositiveInt(durationDays, 1);
    if (!parsedDuration) {
      return { status: 400, body: { message: "Duration must be at least 1 day" } };
    }
    lineItem.durationDays = parsedDuration;
  }

  if (dosage !== undefined) {
    const trimmed = String(dosage || "").trim();
    if (!trimmed) {
      return { status: 400, body: { message: "Dosage is required" } };
    }
    lineItem.dosage = trimmed;
  }

  if (instructions !== undefined) {
    lineItem.instructions = String(instructions || "").trim();
  }

  prescription.totalAmount = prescription.lineItems.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
  await prescription.save();

  const updated = await populatePrescriptionDetail(Prescription.findById(prescription._id)).lean();
  return { status: 200, body: serializePrescriptionDetail(updated) };
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
