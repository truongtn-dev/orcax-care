import mongoose from "mongoose";
import { Appointment } from "../models/Appointment.js";
import { Doctor } from "../models/Doctor.js";
import { Encounter } from "../models/Encounter.js";
import { formatDateOnly } from "../utils/shiftTime.js";

const VALID_STATUSES = new Set(["confirmed", "checked-in", "completed", "cancelled"]);

async function resolveDoctorForUser(userId) {
  const doctor = await Doctor.findOne({ userId, isActive: true })
    .populate("userId", "fullName isActive")
    .lean();

  if (!doctor || !doctor.userId?.isActive) {
    return null;
  }

  return doctor;
}

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function populateAppointment(query) {
  return query
    .populate("patientUserId", "fullName email phone")
    .populate({
      path: "slotId",
      select: "date startTime endTime status roomId doctorId",
      populate: { path: "roomId", select: "name roomNumber roomCode" },
    });
}

function formatReferenceCode(appointmentId) {
  const value = appointmentId?.toString() || "";
  if (!value) return "";
  return `APT-${value.slice(-6).toUpperCase()}`;
}

function serializeAppointment(appointment, encounterId = null) {
  const patient = appointment.patientUserId;
  const slot = appointment.slotId;
  const room = slot?.roomId;
  const id = appointment._id.toString();

  return {
    _id: id,
    referenceCode: formatReferenceCode(id),
    status: appointment.status,
    encounterId: encounterId ? encounterId.toString() : null,
    reason: appointment.reason || "",
    fee: appointment.fee,
    patientName: patient?.fullName || "",
    patientEmail: patient?.email || "",
    slot: slot
      ? {
          _id: slot._id.toString(),
          date: formatDateOnly(slot.date),
          startTime: slot.startTime,
          endTime: slot.endTime,
          status: slot.status,
          roomName: room?.name || "",
        }
      : null,
    createdAt: appointment.createdAt,
    updatedAt: appointment.updatedAt,
  };
}

function sortBySlotTime(items, direction) {
  const multiplier = direction === "desc" ? -1 : 1;
  return [...items].sort((a, b) => {
    const aTime = a.slot?.startTime || "";
    const bTime = b.slot?.startTime || "";
    return aTime.localeCompare(bTime) * multiplier;
  });
}

export async function listTodayAppointments(userId, query = {}) {
  const doctor = await resolveDoctorForUser(userId);
  if (!doctor) {
    return { status: 404, body: { message: "Doctor profile not found" } };
  }

  const { start, end } = todayRange();
  const appointmentFilter = { doctorId: doctor._id };
  const status = String(query.status || "all").trim();
  if (status !== "all") {
    if (!VALID_STATUSES.has(status)) {
      return { status: 400, body: { message: "Invalid appointment status" } };
    }
    appointmentFilter.status = status;
  }

  const rows = await populateAppointment(Appointment.find(appointmentFilter)).lean();
  const todayRows = rows.filter((appointment) => {
    const slotDate = appointment.slotId?.date;
    return slotDate && slotDate >= start && slotDate < end;
  });
  const sort = String(query.sort || "asc").toLowerCase() === "desc" ? "desc" : "asc";
  const encounterRows = await Encounter.find({
    appointmentId: { $in: todayRows.map((appointment) => appointment._id) },
  })
    .select("appointmentId")
    .lean();
  const encounterByAppointment = new Map(
    encounterRows.map((row) => [row.appointmentId.toString(), row._id.toString()])
  );
  const items = sortBySlotTime(
    todayRows.map((appointment) =>
      serializeAppointment(appointment, encounterByAppointment.get(appointment._id.toString()))
    ),
    sort
  );

  return {
    status: 200,
    body: {
      date: formatDateOnly(start),
      total: items.length,
      items,
    },
  };
}

export async function getAppointment(userId, appointmentId) {
  const doctor = await resolveDoctorForUser(userId);
  if (!doctor) {
    return { status: 404, body: { message: "Doctor profile not found" } };
  }

  if (!appointmentId || !mongoose.Types.ObjectId.isValid(appointmentId)) {
    return { status: 400, body: { message: "Invalid appointment" } };
  }

  const appointment = await populateAppointment(
    Appointment.findOne({ _id: appointmentId, doctorId: doctor._id })
  ).lean();

  if (!appointment) {
    return { status: 404, body: { message: "Appointment not found" } };
  }

  const encounter = await Encounter.findOne({ appointmentId: appointment._id }).select("_id").lean();

  return {
    status: 200,
    body: serializeAppointment(appointment, encounter?._id || null),
  };
}
