import mongoose from "mongoose";
import { AppointmentSlot } from "../models/AppointmentSlot.js";
import { Doctor } from "../models/Doctor.js";
import {
  DEFAULT_AVAILABILITY_HORIZON_DAYS,
  DEFAULT_CONSULTATION_FEE_VND,
  MAX_AVAILABILITY_RANGE_DAYS,
} from "../config/booking.js";
import {
  buildDayEntries,
  groupSlotsByDate,
  summarizePublicSlots,
} from "../utils/appointmentSlotSerializer.js";
import { isMongoObjectId } from "../utils/doctorSlug.js";
import {
  formatDateOnly,
  isSlotDatetimePast,
  parseDateOnly,
  startOfToday,
} from "../utils/shiftTime.js";

function resolveDateRange(query = {}) {
  const today = startOfToday();
  let rangeStart = parseDateOnly(query.startDate) || today;
  let rangeEnd = parseDateOnly(query.endDate);

  if (!rangeEnd) {
    rangeEnd = new Date(today);
    rangeEnd.setDate(rangeEnd.getDate() + DEFAULT_AVAILABILITY_HORIZON_DAYS - 1);
  }

  if (rangeStart < today) {
    rangeStart = today;
  }
  if (rangeEnd < rangeStart) {
    return { error: { status: 400, body: { message: "endDate must be on or after startDate" } } };
  }

  const daySpan = Math.floor((rangeEnd - rangeStart) / (24 * 60 * 60 * 1000)) + 1;
  if (daySpan > MAX_AVAILABILITY_RANGE_DAYS) {
    return {
      error: {
        status: 400,
        body: { message: `Date range cannot exceed ${MAX_AVAILABILITY_RANGE_DAYS} days` },
      },
    };
  }

  return { rangeStart, rangeEnd };
}

async function loadActiveDoctor(identifier) {
  if (!identifier) return null;

  const query = { isActive: true };
  if (isMongoObjectId(identifier)) {
    query._id = identifier;
  } else {
    query.slug = String(identifier).trim().toLowerCase();
  }

  return Doctor.findOne(query)
    .populate("userId", "fullName isActive")
    .populate("specialtyId", "name code")
    .lean();
}

function filterBookableSlots(rows) {
  return rows.filter(
    (slot) => slot.status === "available" && !isSlotDatetimePast(slot.date, slot.startTime)
  );
}

export function getConsultationFee() {
  return DEFAULT_CONSULTATION_FEE_VND;
}

export async function getDoctorAvailability(identifier, query = {}) {
  const doctor = await loadActiveDoctor(identifier);
  if (!doctor || !doctor.userId?.isActive) {
    return { status: 404, body: { message: "Doctor not found" } };
  }

  const resolved = resolveDateRange(query);
  if (resolved.error) return resolved.error;
  const { rangeStart, rangeEnd } = resolved;

  const rows = await AppointmentSlot.find({
    doctorId: doctor._id,
    status: "available",
    date: { $gte: rangeStart, $lte: rangeEnd },
  })
    .populate("roomId", "name roomNumber roomCode")
    .sort({ date: 1, startTime: 1 })
    .lean();

  const bookable = filterBookableSlots(rows);
  const buckets = groupSlotsByDate(bookable, { publicView: true });
  const days = buildDayEntries(rangeStart, rangeEnd, buckets);

  return {
    status: 200,
    body: {
      doctor: {
        _id: doctor._id.toString(),
        slug: doctor.slug || "",
        fullName: doctor.userId?.fullName || "",
        specialty: doctor.specialtyId?.name || "",
      },
      consultationFee: getConsultationFee(),
      currency: "VND",
      range: {
        startDate: formatDateOnly(rangeStart),
        endDate: formatDateOnly(rangeEnd),
      },
      days,
      summary: summarizePublicSlots(bookable),
    },
  };
}

export async function getAvailabilitySummariesForDoctors(doctorIds, horizonDays = DEFAULT_AVAILABILITY_HORIZON_DAYS) {
  if (!doctorIds.length) return new Map();

  const today = startOfToday();
  const rangeEnd = new Date(today);
  rangeEnd.setDate(rangeEnd.getDate() + horizonDays - 1);

  const objectIds = doctorIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  const rows = await AppointmentSlot.find({
    doctorId: { $in: objectIds },
    status: "available",
    date: { $gte: today, $lte: rangeEnd },
  })
    .select("doctorId date startTime")
    .sort({ date: 1, startTime: 1 })
    .lean();

  const summaries = new Map();
  for (const id of doctorIds) {
    summaries.set(String(id), { availableCount: 0, nextAvailableDate: null });
  }

  for (const slot of rows) {
    if (isSlotDatetimePast(slot.date, slot.startTime)) continue;

    const key = slot.doctorId.toString();
    const current = summaries.get(key) || { availableCount: 0, nextAvailableDate: null };
    current.availableCount += 1;
    if (!current.nextAvailableDate) {
      current.nextAvailableDate = formatDateOnly(slot.date);
    }
    summaries.set(key, current);
  }

  return summaries;
}
