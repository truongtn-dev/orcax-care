import { Doctor } from "../models/Doctor.js";
import { buildWeeklyPattern, listWorkShifts } from "./adminWorkShift.service.js";

async function resolveDoctorForUser(userId) {
  const doctor = await Doctor.findOne({ userId, isActive: true })
    .populate("userId", "fullName isActive")
    .lean();

  if (!doctor || !doctor.userId?.isActive) {
    return null;
  }

  return doctor;
}

export async function listMyWorkShifts(userId, query = {}) {
  const doctor = await resolveDoctorForUser(userId);
  if (!doctor) {
    return { status: 404, body: { message: "Doctor profile not found" } };
  }

  const result = await listWorkShifts({
    ...query,
    doctorId: doctor._id.toString(),
    isActive: query.isActive ?? "true",
  });

  return {
    status: 200,
    body: {
      ...result,
      doctor: {
        _id: doctor._id.toString(),
        fullName: doctor.userId?.fullName || "",
      },
      weeklyPattern: buildWeeklyPattern(result.items),
    },
  };
}
