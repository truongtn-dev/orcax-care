import mongoose from "mongoose";
import { Doctor } from "../models/Doctor.js";
import { Encounter } from "../models/Encounter.js";
import { listActiveImagesByEncounterIds } from "./doctorMedicalImage.service.js";
import { formatDateOnly } from "../utils/shiftTime.js";

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

  const signed = await populateEncounter(Encounter.findById(encounter._id)).lean();
  const imageMap = await listActiveImagesByEncounterIds([signed._id]);
  return {
    status: 200,
    body: serializeEncounter(signed, imageMap.get(signed._id.toString()) || []),
  };
}
