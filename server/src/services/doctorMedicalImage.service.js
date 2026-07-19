import mongoose from "mongoose";
import { Doctor } from "../models/Doctor.js";
import { Encounter } from "../models/Encounter.js";
import { MedicalImage } from "../models/MedicalImage.js";
import { User } from "../models/User.js";
import { notifyPatientSafe } from "./notification.service.js";
import { sendResultsReadyEmail } from "./mail.service.js";

async function resolveDoctorForUser(userId) {
  const doctor = await Doctor.findOne({ userId, isActive: true }).lean();
  return doctor || null;
}

export function serializeMedicalImage(image) {
  return {
    _id: image._id.toString(),
    type: image.type || "",
    title: image.title || "",
    url: image.url || "",
    thumbnailUrl: image.thumbnailUrl || "",
    mimeType: image.mimeType || "",
    sizeBytes: image.sizeBytes || 0,
    createdAt: image.createdAt,
  };
}

export async function listActiveImagesByEncounterIds(encounterIds = []) {
  const ids = encounterIds.filter(Boolean);
  if (ids.length === 0) return new Map();

  const rows = await MedicalImage.find({
    encounterId: { $in: ids },
    deletedAt: null,
  })
    .sort({ createdAt: -1 })
    .lean();

  const map = new Map();
  for (const row of rows) {
    const key = row.encounterId.toString();
    const list = map.get(key) || [];
    list.push(serializeMedicalImage(row));
    map.set(key, list);
  }
  return map;
}

export async function uploadMedicalImage(userId, encounterId, payload) {
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

  const { title, type, url, thumbnailUrl, mimeType, sizeBytes } = payload;
  if (!url) {
    return { status: 400, body: { message: "Image URL is required" } };
  }
  
  if (sizeBytes && sizeBytes > 10 * 1024 * 1024) {
    return { status: 400, body: { message: "Image size exceeds 10MB limit" } };
  }

  const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
  if (mimeType && !validTypes.includes(mimeType)) {
    return { status: 400, body: { message: "Invalid file type. Only JPEG, PNG, GIF, WEBP and PDF are allowed." } };
  }

  const image = await MedicalImage.create({
    encounterId: encounter._id,
    patientUserId: encounter.patientUserId,
    title: title || "Untitled Image",
    type: type || "image",
    url,
    thumbnailUrl: thumbnailUrl || url,
    mimeType: mimeType || "",
    sizeBytes: sizeBytes || 0,
    uploadedBy: userId,
  });

  const isPdfOrLab =
    String(mimeType || "").toLowerCase() === "application/pdf" ||
    /lab|result|report|pdf/i.test(String(type || "")) ||
    /lab|result|report/i.test(String(title || ""));

  if (isPdfOrLab && encounter.patientUserId) {
    const detailLink = "/patient/emr";
    const resultTitle = "Lab / imaging results ready";
    const resultMessage = `"${image.title}" is ready to view in your medical records.`;
    notifyPatientSafe(encounter.patientUserId, {
      title: resultTitle,
      message: resultMessage,
      type: "results",
      link: detailLink,
    });
    User.findById(encounter.patientUserId)
      .select("fullName email")
      .lean()
      .then((patient) => {
        if (!patient?.email) return null;
        return sendResultsReadyEmail(patient, {
          title: resultTitle,
          message: resultMessage,
          detailUrl: detailLink,
        });
      })
      .catch((err) => {
        console.error("[imaging] results email failed:", err?.message || err);
      });
  }

  return { status: 201, body: serializeMedicalImage(image) };
}

export async function deleteMedicalImage(userId, imageId) {
  const doctor = await resolveDoctorForUser(userId);
  if (!doctor) {
    return { status: 404, body: { message: "Doctor profile not found" } };
  }
  if (!imageId || !mongoose.Types.ObjectId.isValid(imageId)) {
    return { status: 400, body: { message: "Invalid medical image" } };
  }

  const image = await MedicalImage.findOne({ _id: imageId, deletedAt: null });
  if (!image) {
    return { status: 404, body: { message: "Medical image not found" } };
  }

  const encounter = await Encounter.findOne({
    _id: image.encounterId,
    doctorId: doctor._id,
  }).lean();
  if (!encounter) {
    return { status: 404, body: { message: "Medical image not found" } };
  }
  if (encounter.status === "signed") {
    return { status: 409, body: { message: "Encounter is signed off" } };
  }

  image.deletedAt = new Date();
  image.deletedBy = userId;
  await image.save();

  return { status: 200, body: { message: "Medical image deleted" } };
}
