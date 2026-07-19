import mongoose from "mongoose";
import { Appointment } from "../models/Appointment.js";
import { ClinicalAuditLog } from "../models/ClinicalAuditLog.js";
import { Doctor } from "../models/Doctor.js";
import { Encounter } from "../models/Encounter.js";
import { Icd10Catalog } from "../models/Icd10Catalog.js";
import { Prescription } from "../models/Prescription.js";
import { User } from "../models/User.js";
import { listActiveImagesByEncounterIds } from "./doctorMedicalImage.service.js";
import { formatDateOnly } from "../utils/shiftTime.js";
import { notifyPatientSafe } from "./notification.service.js";
import { sendResultsReadyEmail } from "./mail.service.js";

async function resolveDoctorForUser(userId) {
  const doctor = await Doctor.findOne({ userId, isActive: true }).populate("userId", "fullName").lean();
  if (!doctor) return null;
  return doctor;
}

function serializeDoctor(doctor) {
  const user = doctor?.userId;
  return {
    _id: doctor?._id?.toString() || "",
    userId: user?._id?.toString() || "",
    fullName: user?.fullName || "",
  };
}

function serializePatient(patient) {
  return {
    userId: patient?._id?.toString() || "",
    fullName: patient?.fullName || "",
    email: patient?.email || "",
    phone: patient?.phone || "",
  };
}

function serializeAppointment(appointment) {
  const slot = appointment?.slotId;
  const room = slot?.roomId;
  return {
    _id: appointment?._id?.toString() || "",
    status: appointment?.status || "",
    reason: appointment?.reason || "",
    date: slot?.date ? formatDateOnly(slot.date) : "",
    startTime: slot?.startTime || "",
    endTime: slot?.endTime || "",
    roomName: room?.name || "",
  };
}

function serializeSignedOffBy(user) {
  if (!user) return null;
  return {
    userId: user._id?.toString() || "",
    fullName: user.fullName || "",
    email: user.email || "",
  };
}

function serializeEncounter(row, images = []) {
  return {
    _id: row._id.toString(),
    status: row.status,
    visitDate: formatDateOnly(row.visitDate),
    chiefComplaint: row.chiefComplaint || "",
    clinicalNotes: row.clinicalNotes || "",
    vitals: row.vitals || {},
    diagnoses: (row.diagnoses || []).map((diagnosis) => ({
      code: diagnosis.code || "",
      text: diagnosis.text || "",
      note: diagnosis.note || "",
    })),
    doctor: serializeDoctor(row.doctorId),
    patient: serializePatient(row.patientUserId),
    appointment: serializeAppointment(row.appointmentId),
    signedOffAt: row.signedOffAt,
    signedOffBy: serializeSignedOffBy(row.signedOffBy),
    images,
    canSignOff: row.status === "draft",
    updatedAt: row.updatedAt,
  };
}

function populateEncounter(query) {
  return query
    .populate({
      path: "doctorId",
      select: "userId",
      populate: { path: "userId", select: "fullName" },
    })
    .populate("patientUserId", "fullName email phone")
    .populate("signedOffBy", "fullName email")
    .populate({
      path: "appointmentId",
      select: "status reason slotId",
      populate: {
        path: "slotId",
        select: "date startTime endTime roomId",
        populate: { path: "roomId", select: "name roomNumber roomCode" },
      },
    });
}

export async function getEncounter(userId, encounterId) {
  const doctor = await resolveDoctorForUser(userId);
  if (!doctor) {
    return { status: 404, body: { message: "Doctor profile not found" } };
  }
  if (!encounterId || !mongoose.Types.ObjectId.isValid(encounterId)) {
    return { status: 400, body: { message: "Invalid encounter" } };
  }

  const encounter = await populateEncounter(
    Encounter.findOne({ _id: encounterId, doctorId: doctor._id })
  ).lean();
  if (!encounter) {
    return { status: 404, body: { message: "Encounter not found" } };
  }

  const imageMap = await listActiveImagesByEncounterIds([encounter._id]);
  return {
    status: 200,
    body: serializeEncounter(encounter, imageMap.get(encounter._id.toString()) || []),
  };
}

export async function signOffEncounter(userId, encounterId) {
  const doctor = await resolveDoctorForUser(userId);
  if (!doctor) {
    return { status: 404, body: { message: "Doctor profile not found" } };
  }
  if (!encounterId || !mongoose.Types.ObjectId.isValid(encounterId)) {
    return { status: 400, body: { message: "Invalid encounter" } };
  }

  const encounter = await Encounter.findOne({ _id: encounterId, doctorId: doctor._id });
  if (!encounter) {
    return { status: 404, body: { message: "Encounter not found" } };
  }
  if (encounter.status === "signed") {
    return { status: 409, body: { message: "Encounter is already signed off" } };
  }
  if (!encounter.diagnoses?.length) {
    return { status: 400, body: { message: "At least one diagnosis is required before sign-off" } };
  }

  encounter.status = "signed";
  encounter.signedOffAt = new Date();
  encounter.signedOffBy = userId;
  await encounter.save();

  await Prescription.updateMany(
    { encounterId: encounter._id, status: "draft" },
    { $set: { status: "issued", issuedAt: new Date() } }
  );

  const issuedCount = await Prescription.countDocuments({
    encounterId: encounter._id,
    status: "issued",
  });

  if (issuedCount > 0 && encounter.patientUserId) {
    const detailLink = "/patient/prescriptions";
    const title = "Prescription ready";
    const message =
      issuedCount === 1
        ? "Your prescription is ready. You can view and download it from My Prescriptions."
        : `${issuedCount} prescriptions are ready. You can view and download them from My Prescriptions.`;

    notifyPatientSafe(encounter.patientUserId, {
      title,
      message,
      type: "results",
      link: detailLink,
    });

    User.findById(encounter.patientUserId)
      .select("fullName email")
      .lean()
      .then((patient) => {
        if (!patient?.email) return null;
        return sendResultsReadyEmail(patient, { title, message, detailUrl: detailLink });
      })
      .catch((err) => {
        console.error("[encounter] results email failed:", err?.message || err);
      });
  }

  const signed = await populateEncounter(Encounter.findById(encounter._id)).lean();
  const imageMap = await listActiveImagesByEncounterIds([signed._id]);
  return {
    status: 200,
    body: serializeEncounter(signed, imageMap.get(signed._id.toString()) || []),
  };
}

export async function updateEncounter(userId, encounterId, payload) {
  const doctor = await resolveDoctorForUser(userId);
  if (!doctor) {
    return { status: 404, body: { message: "Doctor profile not found" } };
  }
  if (!encounterId || !mongoose.Types.ObjectId.isValid(encounterId)) {
    return { status: 400, body: { message: "Invalid encounter" } };
  }

  const encounter = await Encounter.findOne({ _id: encounterId, doctorId: doctor._id });
  if (!encounter) {
    return { status: 404, body: { message: "Encounter not found" } };
  }
  if (encounter.status === "signed") {
    return { status: 409, body: { message: "Encounter is already signed off and cannot be edited" } };
  }

  if (payload.chiefComplaint !== undefined) encounter.chiefComplaint = payload.chiefComplaint;
  if (payload.clinicalNotes !== undefined) encounter.clinicalNotes = payload.clinicalNotes;
  
  if (payload.vitals) {
    encounter.vitals = encounter.vitals || {};
    if (payload.vitals.temperatureC !== undefined) encounter.vitals.temperatureC = payload.vitals.temperatureC;
    if (payload.vitals.bloodPressure !== undefined) encounter.vitals.bloodPressure = payload.vitals.bloodPressure;
    if (payload.vitals.pulse !== undefined) encounter.vitals.pulse = payload.vitals.pulse;
  }

  await encounter.save();

  const updated = await populateEncounter(Encounter.findById(encounter._id)).lean();
  const imageMap = await listActiveImagesByEncounterIds([updated._id]);
  return {
    status: 200,
    body: serializeEncounter(updated, imageMap.get(updated._id.toString()) || []),
  };
}

function buildInitialEncounterFields(payload = {}) {
  const fields = {
    status: "draft",
    visitDate: new Date(),
  };

  if (payload.chiefComplaint !== undefined) {
    fields.chiefComplaint = String(payload.chiefComplaint || "").trim();
  }

  if (payload.clinicalNotes !== undefined) {
    fields.clinicalNotes = String(payload.clinicalNotes || "").trim();
  }

  if (payload.vitals && typeof payload.vitals === "object") {
    fields.vitals = {
      temperatureC:
        payload.vitals.temperatureC !== undefined && payload.vitals.temperatureC !== ""
          ? Number(payload.vitals.temperatureC)
          : null,
      bloodPressure: String(payload.vitals.bloodPressure || "").trim(),
      pulse:
        payload.vitals.pulse !== undefined && payload.vitals.pulse !== ""
          ? Number(payload.vitals.pulse)
          : null,
    };
  }

  return fields;
}

export async function createEncounter(userId, appointmentId, payload = {}) {
  const doctor = await resolveDoctorForUser(userId);
  if (!doctor) {
    return { status: 404, body: { message: "Doctor profile not found" } };
  }
  if (!appointmentId || !mongoose.Types.ObjectId.isValid(appointmentId)) {
    return { status: 400, body: { message: "Invalid appointment" } };
  }

  const appointment = await Appointment.findOne({ _id: appointmentId, doctorId: doctor._id });
  if (!appointment) {
    return { status: 404, body: { message: "Appointment not found" } };
  }

  if (appointment.status !== "checked-in") {
    return { status: 400, body: { message: "Appointment must be checked-in to start consultation" } };
  }

  const existing = await Encounter.findOne({ appointmentId: appointment._id, doctorId: doctor._id });
  if (existing) {
    const populated = await populateEncounter(Encounter.findById(existing._id)).lean();
    const imageMap = await listActiveImagesByEncounterIds([populated._id]);
    return {
      status: 200,
      body: serializeEncounter(populated, imageMap.get(populated._id.toString()) || []),
    };
  }

  try {
    const initialFields = buildInitialEncounterFields(payload);
    const newEncounter = await Encounter.create({
      patientUserId: appointment.patientUserId,
      doctorId: doctor._id,
      appointmentId: appointment._id,
      ...initialFields,
    });

    const populated = await populateEncounter(Encounter.findById(newEncounter._id)).lean();
    return {
      status: 201,
      body: serializeEncounter(populated, []),
    };
  } catch (err) {
    if (err.code === 11000 || (err.name === "MongoServerError" && err.message.includes("duplicate key"))) {
      const fallback = await Encounter.findOne({ appointmentId: appointment._id, doctorId: doctor._id });
      if (fallback) {
        const populated = await populateEncounter(Encounter.findById(fallback._id)).lean();
        const imageMap = await listActiveImagesByEncounterIds([populated._id]);
        return {
          status: 200,
          body: serializeEncounter(populated, imageMap.get(populated._id.toString()) || []),
        };
      }
    }
    throw err;
  }
}

async function ensureIcd10Seeded() {
  const count = await Icd10Catalog.countDocuments();
  if (count === 0) {
    const defaultIcdCodes = [
      { code: "A09", name: "Infectious gastroenteritis and colitis, unspecified" },
      { code: "E11", name: "Type 2 diabetes mellitus" },
      { code: "I10", name: "Essential (primary) hypertension" },
      { code: "J00", name: "Acute nasopharyngitis [common cold]" },
      { code: "J01", name: "Acute sinusitis" },
      { code: "J02", name: "Acute pharyngitis" },
      { code: "J03", name: "Acute tonsillitis" },
      { code: "J06.9", name: "Acute upper respiratory infection, unspecified" },
      { code: "J20.9", name: "Acute bronchitis, unspecified" },
      { code: "J45", name: "Asthma" },
      { code: "K21.9", name: "Gastro-esophageal reflux disease without esophagitis" },
      { code: "M54.5", name: "Low back pain" },
      { code: "R05", name: "Cough" },
      { code: "R07.9", name: "Chest pain, unspecified" },
      { code: "R50.9", name: "Fever, unspecified" },
      { code: "R51", name: "Headache" },
      { code: "Z00.0", name: "Encounter for general adult medical examination" },
    ];
    await Icd10Catalog.insertMany(defaultIcdCodes);
  }
}

export async function searchIcd10({ q = "" } = {}) {
  await ensureIcd10Seeded();

  const filter = {};
  const search = String(q || "").trim();
  if (search) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: regex }, { code: regex }];
  }

  const items = await Icd10Catalog.find(filter).sort({ code: 1 }).limit(50).lean();
  return {
    status: 200,
    body: {
      items: items.map((item) => ({
        _id: item._id.toString(),
        code: item.code,
        name: item.name,
      })),
    },
  };
}

export async function addDiagnosis(userId, encounterId, { code, note = "" } = {}) {
  const doctor = await resolveDoctorForUser(userId);
  if (!doctor) {
    return { status: 404, body: { message: "Doctor profile not found" } };
  }
  if (!encounterId || !mongoose.Types.ObjectId.isValid(encounterId)) {
    return { status: 400, body: { message: "Invalid encounter" } };
  }
  if (!code || typeof code !== "string") {
    return { status: 400, body: { message: "ICD code is required" } };
  }

  const encounter = await Encounter.findOne({ _id: encounterId, doctorId: doctor._id });
  if (!encounter) {
    return { status: 404, body: { message: "Encounter not found" } };
  }
  if (encounter.status === "signed") {
    return { status: 409, body: { message: "Encounter is already signed off and cannot be edited" } };
  }

  await ensureIcd10Seeded();
  const icd = await Icd10Catalog.findOne({ code: code.toUpperCase() });
  if (!icd) {
    return { status: 404, body: { message: `ICD code ${code} not found in catalog` } };
  }

  const hasDuplicate = encounter.diagnoses.some((d) => d.code === icd.code);
  if (hasDuplicate) {
    return { status: 409, body: { message: `ICD code ${icd.code} is already added to this encounter` } };
  }

  encounter.diagnoses.push({
    code: icd.code,
    text: icd.name,
    note: String(note || "").trim(),
  });

  await encounter.save();

  const updated = await populateEncounter(Encounter.findById(encounter._id)).lean();
  const imageMap = await listActiveImagesByEncounterIds([updated._id]);
  return {
    status: 200,
    body: serializeEncounter(updated, imageMap.get(updated._id.toString()) || []),
  };
}

export async function updateDiagnosis(userId, encounterId, code, payload = {}) {
  const doctor = await resolveDoctorForUser(userId);
  if (!doctor) {
    return { status: 404, body: { message: "Doctor profile not found" } };
  }
  if (!encounterId || !mongoose.Types.ObjectId.isValid(encounterId)) {
    return { status: 400, body: { message: "Invalid encounter" } };
  }
  if (!code) {
    return { status: 400, body: { message: "ICD code is required" } };
  }

  const encounter = await Encounter.findOne({ _id: encounterId, doctorId: doctor._id });
  if (!encounter) {
    return { status: 404, body: { message: "Encounter not found" } };
  }
  if (encounter.status === "signed") {
    return { status: 409, body: { message: "Encounter is already signed off and cannot be edited" } };
  }

  const diagnosis = encounter.diagnoses.find((d) => d.code === String(code).toUpperCase());
  if (!diagnosis) {
    return { status: 404, body: { message: `Diagnosis with code ${code} not found in this encounter` } };
  }

  const previous = {
    code: diagnosis.code,
    text: diagnosis.text,
    note: diagnosis.note || "",
  };

  if (payload.note !== undefined) {
    diagnosis.note = String(payload.note || "").trim();
  }

  // Optional: allow changing ICD code via catalog (fills text from catalog)
  if (payload.code !== undefined && String(payload.code).toUpperCase() !== previous.code) {
    const nextCode = String(payload.code).trim().toUpperCase();
    if (!nextCode) {
      return { status: 400, body: { message: "ICD code is required" } };
    }
    await ensureIcd10Seeded();
    const icd = await Icd10Catalog.findOne({ code: nextCode });
    if (!icd) {
      return { status: 404, body: { message: `ICD code ${nextCode} not found in catalog` } };
    }
    const duplicate = encounter.diagnoses.some((d) => d.code === icd.code && d.code !== previous.code);
    if (duplicate) {
      return { status: 409, body: { message: `ICD code ${icd.code} is already added to this encounter` } };
    }
    diagnosis.code = icd.code;
    diagnosis.text = icd.name;
  }

  await encounter.save();

  // Optional clinical audit trail for diagnosis edits
  try {
    await ClinicalAuditLog.create({
      encounterId: encounter._id,
      action: "update_diagnosis",
      actorUserId: userId,
      note: "Diagnosis entry updated",
      metadata: {
        before: previous,
        after: {
          code: diagnosis.code,
          text: diagnosis.text,
          note: diagnosis.note || "",
        },
      },
    });
  } catch (auditErr) {
    console.error("Clinical audit log failed:", auditErr.message);
  }

  const updated = await populateEncounter(Encounter.findById(encounter._id)).lean();
  const imageMap = await listActiveImagesByEncounterIds([updated._id]);
  return {
    status: 200,
    body: serializeEncounter(updated, imageMap.get(updated._id.toString()) || []),
  };
}

export async function removeDiagnosis(userId, encounterId, code) {
  const doctor = await resolveDoctorForUser(userId);
  if (!doctor) {
    return { status: 404, body: { message: "Doctor profile not found" } };
  }
  if (!encounterId || !mongoose.Types.ObjectId.isValid(encounterId)) {
    return { status: 400, body: { message: "Invalid encounter" } };
  }
  if (!code) {
    return { status: 400, body: { message: "ICD code is required" } };
  }

  const encounter = await Encounter.findOne({ _id: encounterId, doctorId: doctor._id });
  if (!encounter) {
    return { status: 404, body: { message: "Encounter not found" } };
  }
  if (encounter.status === "signed") {
    return { status: 409, body: { message: "Encounter is already signed off and cannot be edited" } };
  }

  const initialLength = encounter.diagnoses.length;
  encounter.diagnoses = encounter.diagnoses.filter((d) => d.code !== code.toUpperCase());

  if (encounter.diagnoses.length === initialLength) {
    return { status: 404, body: { message: `Diagnosis with code ${code} not found in this encounter` } };
  }

  await encounter.save();

  const updated = await populateEncounter(Encounter.findById(encounter._id)).lean();
  const imageMap = await listActiveImagesByEncounterIds([updated._id]);
  return {
    status: 200,
    body: serializeEncounter(updated, imageMap.get(updated._id.toString()) || []),
  };
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

function serializePrescriptionSummary(row) {
  return {
    _id: row._id.toString(),
    status: row.status,
    notes: row.notes || "",
    lineItems: (row.lineItems || []).map(serializeLineItem),
    totalAmount: row.totalAmount || 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getPrescriptionByEncounterId(userId, encounterId) {
  const doctor = await resolveDoctorForUser(userId);
  if (!doctor) {
    return { status: 404, body: { message: "Doctor profile not found" } };
  }
  if (!encounterId || !mongoose.Types.ObjectId.isValid(encounterId)) {
    return { status: 400, body: { message: "Invalid encounter" } };
  }

  const prescription = await Prescription.findOne({ encounterId, doctorId: doctor._id })
    .sort({ createdAt: -1 })
    .lean();
  if (!prescription) {
    return { status: 404, body: { message: "Prescription not found" } };
  }

  return { status: 200, body: serializePrescriptionSummary(prescription) };
}
