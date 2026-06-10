import mongoose from "mongoose";
import { AppointmentSlot } from "../models/AppointmentSlot.js";
import { Doctor } from "../models/Doctor.js";
import { formatDateOnly, parseDateOnly } from "../utils/shiftTime.js";

const STATUS_LABELS = {
  available: "Available",
  booked: "Booked",
  blocked: "Blocked",
};

async function resolveDoctorForUser(userId) {
  const doctor = await Doctor.findOne({ userId, isActive: true })
    .populate("userId", "fullName isActive")
    .lean();

  if (!doctor || !doctor.userId?.isActive) {
    return null;
  }

  return doctor;
}

function serializeSlot(slot) {
  const room = slot.roomId;

  return {
    _id: slot._id.toString(),
    doctorId: slot.doctorId?.toString() || "",
    workShiftId: slot.workShiftId?.toString() || "",
    roomId: room?._id?.toString() || slot.roomId?.toString() || null,
    roomName: room?.name || "",
    date: formatDateOnly(slot.date),
    startTime: slot.startTime,
    endTime: slot.endTime,
    status: slot.status,
    statusLabel: STATUS_LABELS[slot.status] || slot.status,
    createdAt: slot.createdAt,
    updatedAt: slot.updatedAt,
  };
}

function groupSlotsByDate(slots) {
  const buckets = new Map();

  for (const slot of slots) {
    const dateKey = formatDateOnly(slot.date);
    if (!buckets.has(dateKey)) {
      buckets.set(dateKey, []);
    }
    buckets.get(dateKey).push(serializeSlot(slot));
  }

  for (const daySlots of buckets.values()) {
    daySlots.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  return buckets;
}

function buildDayEntries(startDate, endDate, buckets) {
  const days = [];
  const cursor = new Date(startDate);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (cursor <= end) {
    const dateKey = formatDateOnly(cursor);
    days.push({
      date: dateKey,
      dayOfWeek: cursor.getDay(),
      slots: buckets.get(dateKey) || [],
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function summarizeSlots(slots) {
  return slots.reduce(
    (summary, slot) => {
      summary.total += 1;
      if (slot.status === "available") summary.available += 1;
      if (slot.status === "booked") summary.booked += 1;
      if (slot.status === "blocked") summary.blocked += 1;
      return summary;
    },
    { total: 0, available: 0, booked: 0, blocked: 0 }
  );
}

export async function getScheduleCalendar(userId, query = {}) {
  const doctor = await resolveDoctorForUser(userId);
  if (!doctor) {
    return { status: 404, body: { message: "Doctor profile not found" } };
  }

  const rangeStart = parseDateOnly(query.startDate);
  const rangeEnd = parseDateOnly(query.endDate);
  if (!rangeStart || !rangeEnd) {
    return { status: 400, body: { message: "startDate and endDate must use YYYY-MM-DD" } };
  }
  if (rangeEnd < rangeStart) {
    return { status: 400, body: { message: "endDate must be on or after startDate" } };
  }

  const maxDays = 31;
  const daySpan = Math.floor((rangeEnd - rangeStart) / (24 * 60 * 60 * 1000)) + 1;
  if (daySpan > maxDays) {
    return { status: 400, body: { message: `Date range cannot exceed ${maxDays} days` } };
  }

  const rows = await AppointmentSlot.find({
    doctorId: doctor._id,
    date: { $gte: rangeStart, $lte: rangeEnd },
  })
    .populate("roomId", "name roomNumber roomCode")
    .sort({ date: 1, startTime: 1 })
    .lean();

  const buckets = groupSlotsByDate(rows);
  const days = buildDayEntries(rangeStart, rangeEnd, buckets);
  const flatSlots = rows.map(serializeSlot);

  return {
    status: 200,
    body: {
      doctor: {
        _id: doctor._id.toString(),
        fullName: doctor.userId?.fullName || "",
      },
      range: {
        startDate: formatDateOnly(rangeStart),
        endDate: formatDateOnly(rangeEnd),
        view: String(query.view || "week").toLowerCase() === "day" ? "day" : "week",
      },
      days,
      summary: summarizeSlots(flatSlots),
    },
  };
}

export async function getAppointmentSlotDetail(userId, slotId) {
  const doctor = await resolveDoctorForUser(userId);
  if (!doctor) {
    return { status: 404, body: { message: "Doctor profile not found" } };
  }

  if (!slotId || !mongoose.Types.ObjectId.isValid(slotId)) {
    return { status: 400, body: { message: "Invalid appointment slot" } };
  }

  const slot = await AppointmentSlot.findOne({
    _id: slotId,
    doctorId: doctor._id,
  })
    .populate("roomId", "name roomNumber roomCode")
    .lean();

  if (!slot) {
    return { status: 404, body: { message: "Appointment slot not found" } };
  }

  return { status: 200, body: serializeSlot(slot) };
}
