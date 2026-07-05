import mongoose from "mongoose";
import { Appointment } from "../models/Appointment.js";
import { Doctor } from "../models/Doctor.js";
import { getDoctorBySlugOrId } from "./doctorSearch.service.js";

function maskPatientName(fullName) {
  if (!fullName) return "Patient";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return `${parts[0].charAt(0)}.`;
  return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
}

function serializeReview(appointment) {
  const patient = appointment.patientUserId;
  return {
    _id: appointment._id.toString(),
    rating: appointment.rating,
    comment: appointment.reviewComment || "",
    reviewedAt: appointment.reviewedAt || appointment.updatedAt,
    patientDisplayName: maskPatientName(patient?.fullName),
  };
}

async function resolveDoctorId(identifier) {
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    const doctor = await Doctor.findById(identifier).select("_id isActive").lean();
    if (doctor?.isActive !== false) {
      return doctor._id;
    }
  }

  const doctor = await getDoctorBySlugOrId(identifier);
  return doctor?._id || null;
}

export async function listDoctorReviews(identifier, { page = 1, limit = 10 } = {}) {
  const doctorId = await resolveDoctorId(identifier);
  if (!doctorId) {
    return { status: 404, body: { message: "Doctor not found." } };
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const filter = {
    doctorId,
    rating: { $ne: null },
    reviewedAt: { $ne: null },
  };

  const [items, total] = await Promise.all([
    Appointment.find(filter)
      .populate("patientUserId", "fullName")
      .sort({ reviewedAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Appointment.countDocuments(filter),
  ]);

  return {
    status: 200,
    body: {
      items: items.map(serializeReview),
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.max(1, Math.ceil(total / limitNum)),
    },
  };
}
