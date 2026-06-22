import mongoose from "mongoose";
import { Doctor } from "../models/Doctor.js";
import { Encounter } from "../models/Encounter.js";
import { MedicalImage } from "../models/MedicalImage.js";

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
