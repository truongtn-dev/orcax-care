import mongoose from "mongoose";
import { AppointmentSlot } from "../models/AppointmentSlot.js";
import { Doctor } from "../models/Doctor.js";
import {
  buildDayEntries,
  groupSlotsByDate,
  serializeSlot,
  summarizeSlots,
} from "../utils/appointmentSlotSerializer.js";
import { formatDateOnly, isSlotDatetimePast, parseDateOnly } from "../utils/shiftTime.js";

async function resolveDoctorForUser(userId) {
  const doctor = await Doctor.findOne({ userId, isActive: true })
    .populate("userId", "fullName isActive")
    .lean();

  if (!doctor || !doctor.userId?.isActive) {
    return null;
  }

  return doctor;
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
  const flatSlots = rows.map((row) => serializeSlot(row));

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

async function findOwnSlot(userId, slotId) {
  const doctor = await resolveDoctorForUser(userId);
  if (!doctor) {
    return { error: { status: 404, body: { message: "Doctor profile not found" } } };
  }

  if (!slotId || !mongoose.Types.ObjectId.isValid(slotId)) {
    return { error: { status: 400, body: { message: "Invalid appointment slot" } } };
  }

  const slot = await AppointmentSlot.findOne({
    _id: slotId,
    doctorId: doctor._id,
  });

  if (!slot) {
    return { error: { status: 404, body: { message: "Appointment slot not found" } } };
  }

  return { doctor, slot };
}

export async function blockAppointmentSlot(userId, slotId) {
  const result = await findOwnSlot(userId, slotId);
  if (result.error) return result.error;

  const { slot } = result;

  if (isSlotDatetimePast(slot.date, slot.startTime)) {
    return {
      status: 409,
      body: { message: "Cannot change status of a past appointment slot" },
    };
  }

  if (slot.status === "booked") {
    return {
      status: 409,
      body: { message: "Cannot block a booked appointment slot" },
    };
  }

  if (slot.status === "blocked") {
    const populated = await AppointmentSlot.findById(slot._id)
      .populate("roomId", "name roomNumber roomCode")
      .lean();
    return { status: 200, body: serializeSlot(populated) };
  }

  slot.status = "blocked";
  await slot.save();

  const populated = await AppointmentSlot.findById(slot._id)
    .populate("roomId", "name roomNumber roomCode")
    .lean();

  return { status: 200, body: serializeSlot(populated) };
}

export async function unblockAppointmentSlot(userId, slotId) {
  const result = await findOwnSlot(userId, slotId);
  if (result.error) return result.error;

  const { slot } = result;

  if (isSlotDatetimePast(slot.date, slot.startTime)) {
    return {
      status: 409,
      body: { message: "Cannot change status of a past appointment slot" },
    };
  }

  if (slot.status === "booked") {
    return {
      status: 409,
      body: { message: "Cannot unlock a booked appointment slot" },
    };
  }

  if (slot.status === "available") {
    const populated = await AppointmentSlot.findById(slot._id)
      .populate("roomId", "name roomNumber roomCode")
      .lean();
    return { status: 200, body: serializeSlot(populated) };
  }

  slot.status = "available";
  await slot.save();

  const populated = await AppointmentSlot.findById(slot._id)
    .populate("roomId", "name roomNumber roomCode")
    .lean();

  return { status: 200, body: serializeSlot(populated) };
}
