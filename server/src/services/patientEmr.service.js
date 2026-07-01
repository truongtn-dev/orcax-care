import mongoose from "mongoose";
import { Encounter } from "../models/Encounter.js";
import { formatDateOnly } from "../utils/shiftTime.js";

function parseDateBoundary(value, boundary) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const date = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return "invalid";
  if (boundary === "end") {
    date.setUTCHours(23, 59, 59, 999);
  }
  return date;
}

function serializeDoctor(doctor) {
  const user = doctor?.userId;
  return {
    _id: doctor?._id?.toString() || "",
    fullName: user?.fullName || "",
    specialtyId: doctor?.specialtyId?.toString?.() || "",
    photoUrl: doctor?.photoUrl || "",
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

function serializeEncounter(row) {
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
    appointment: serializeAppointment(row.appointmentId),
    signedOffAt: row.signedOffAt,
    updatedAt: row.updatedAt,
  };
}

export async function listTimeline(userId, query = {}) {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return { status: 400, body: { message: "Invalid patient" } };
  }

  const from = parseDateBoundary(query.from, "start");
  const to = parseDateBoundary(query.to, "end");
  if (from === "invalid" || to === "invalid") {
    return { status: 400, body: { message: "Invalid date range" } };
  }
  if (from && to && from > to) {
    return { status: 400, body: { message: "Invalid date range" } };
  }

  const filter = { patientUserId: userId };
  if (from || to) {
    filter.visitDate = {};
    if (from) filter.visitDate.$gte = from;
    if (to) filter.visitDate.$lte = to;
  }

  const rows = await Encounter.find(filter)
    .populate({
      path: "doctorId",
      select: "userId specialtyId photoUrl",
      populate: { path: "userId", select: "fullName" },
    })
    .populate({
      path: "appointmentId",
      select: "status reason slotId",
      populate: {
        path: "slotId",
        select: "date startTime endTime roomId",
        populate: { path: "roomId", select: "name roomNumber roomCode" },
      },
    })
    .sort({ visitDate: -1, createdAt: -1 })
    .lean();

  return {
    status: 200,
    body: {
      total: rows.length,
      items: rows.map(serializeEncounter),
    },
  };
}
