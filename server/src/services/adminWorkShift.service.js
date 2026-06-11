import mongoose from "mongoose";
import { ClinicRoom } from "../models/ClinicRoom.js";
import { Doctor } from "../models/Doctor.js";
import { AppointmentSlot } from "../models/AppointmentSlot.js";
import { WorkShift } from "../models/WorkShift.js";
import {
  DAY_OF_WEEK_LABELS,
  computeSlotDurationMin,
  doTimeRangesOverlap,
  isValidTimeString,
  timeToMinutes,
} from "../utils/shiftTime.js";

function serializeWorkShift(shift) {
  const doctor = shift.doctorId;
  const room = shift.roomId;

  return {
    _id: shift._id.toString(),
    doctorId: doctor?._id?.toString() || shift.doctorId?.toString(),
    doctorName: doctor?.userId?.fullName || "",
    roomId: room?._id?.toString() || shift.roomId?.toString() || null,
    roomName: room?.name || "",
    dayOfWeek: shift.dayOfWeek,
    dayLabel: DAY_OF_WEEK_LABELS[shift.dayOfWeek] || "",
    startTime: shift.startTime,
    endTime: shift.endTime,
    maxPatients: shift.maxPatients,
    slotDurationMin: shift.slotDurationMin,
    isActive: shift.isActive,
    createdAt: shift.createdAt,
    updatedAt: shift.updatedAt,
  };
}

function shiftQuery() {
  return WorkShift.find()
    .populate({ path: "doctorId", populate: { path: "userId", select: "fullName isActive" } })
    .populate("roomId", "name roomNumber roomCode");
}

async function findOverlappingShift({ doctorId, dayOfWeek, startTime, endTime, excludeId }) {
  const filter = {
    doctorId,
    dayOfWeek,
    isActive: true,
  };
  if (excludeId) {
    filter._id = { $ne: excludeId };
  }

  const existing = await WorkShift.find(filter).lean();
  return existing.find((shift) => doTimeRangesOverlap(startTime, endTime, shift.startTime, shift.endTime));
}

export async function createWorkShift(payload) {
  const {
    doctorId,
    roomId,
    dayOfWeek,
    startTime,
    endTime,
    maxPatients,
    slotDurationMin,
    isActive = true,
  } = payload;

  if (!doctorId || !mongoose.Types.ObjectId.isValid(doctorId)) {
    return { status: 400, body: { message: "Invalid doctor" } };
  }

  const day = Number(dayOfWeek);
  if (!Number.isInteger(day) || day < 0 || day > 6) {
    return { status: 400, body: { message: "Day of week must be from 0 (Sun) to 6 (Sat)" } };
  }

  const start = (startTime || "").trim();
  const end = (endTime || "").trim();
  if (!isValidTimeString(start) || !isValidTimeString(end)) {
    return { status: 400, body: { message: "Start/end time must use HH:mm format" } };
  }
  if (timeToMinutes(end) <= timeToMinutes(start)) {
    return { status: 400, body: { message: "End time must be after start time" } };
  }

  const capacity = parseInt(maxPatients, 10);
  if (!capacity || capacity < 1) {
    return { status: 400, body: { message: "Maximum patients must be >= 1" } };
  }

  const doctor = await Doctor.findById(doctorId).populate("userId", "fullName isActive");
  if (!doctor || !doctor.isActive) {
    return { status: 404, body: { message: "Active doctor not found" } };
  }
  if (!doctor.userId?.isActive) {
    return { status: 400, body: { message: "Doctor account is not activated" } };
  }

  let roomObjectId = null;
  if (roomId) {
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return { status: 400, body: { message: "Invalid clinic room" } };
    }
    const room = await ClinicRoom.findById(roomId);
    if (!room || !room.isActive) {
      return { status: 404, body: { message: "Active clinic room not found" } };
    }
    roomObjectId = room._id;
  }

  const overlap = await findOverlappingShift({
    doctorId: doctor._id,
    dayOfWeek: day,
    startTime: start,
    endTime: end,
  });
  if (overlap) {
    return {
      status: 409,
      body: {
        message: "Shift overlaps with an existing shift for this doctor on the same day",
        conflict: {
          shiftId: overlap._id.toString(),
          startTime: overlap.startTime,
          endTime: overlap.endTime,
        },
      },
    };
  }

  const duration =
    slotDurationMin != null && slotDurationMin !== ""
      ? parseInt(slotDurationMin, 10)
      : computeSlotDurationMin(start, end, capacity);

  if (!duration || duration < 15) {
    return { status: 400, body: { message: "Each slot duration must be >= 15 minutes" } };
  }

  const shift = await WorkShift.create({
    doctorId: doctor._id,
    roomId: roomObjectId,
    dayOfWeek: day,
    startTime: start,
    endTime: end,
    maxPatients: capacity,
    slotDurationMin: duration,
    isActive: isActive !== false,
  });

  const populated = await shiftQuery().findById(shift._id).lean();
  return { status: 201, body: serializeWorkShift(populated) };
}

export function buildWeeklyPattern(shifts) {
  const buckets = Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    dayLabel: DAY_OF_WEEK_LABELS[dayOfWeek] || "",
    shifts: [],
  }));

  for (const shift of shifts) {
    const day = shift.dayOfWeek;
    if (day >= 0 && day <= 6) {
      buckets[day].shifts.push(shift);
    }
  }

  for (const bucket of buckets) {
    bucket.shifts.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  }

  return buckets;
}

export async function listWorkShifts({
  doctorId = "",
  isActive = "",
  page = 1,
  limit = 50,
} = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const filter = {};

  if (doctorId && mongoose.Types.ObjectId.isValid(doctorId)) {
    filter.doctorId = new mongoose.Types.ObjectId(doctorId);
  }

  const activeFilter = String(isActive || "").trim().toLowerCase();
  if (activeFilter === "true") filter.isActive = true;
  if (activeFilter === "false") filter.isActive = false;

  const skip = (pageNum - 1) * limitNum;
  const [rows, total] = await Promise.all([
    shiftQuery().find(filter).sort({ dayOfWeek: 1, startTime: 1 }).skip(skip).limit(limitNum).lean(),
    WorkShift.countDocuments(filter),
  ]);

  const items = rows.map(serializeWorkShift);
  const weeklyPattern = buildWeeklyPattern(items);

  return {
    items,
    weeklyPattern,
    page: pageNum,
    limit: limitNum,
    total,
    totalPages: Math.ceil(total / limitNum) || 1,
    filters: {
      doctorId: doctorId || null,
      isActive: activeFilter || "all",
    },
  };
}

export async function getWorkShiftById(shiftId) {
  if (!shiftId || !mongoose.Types.ObjectId.isValid(shiftId)) {
    return { status: 400, body: { message: "Invalid work shift" } };
  }

  const shift = await shiftQuery().findById(shiftId).lean();
  if (!shift) {
    return { status: 404, body: { message: "Work shift not found" } };
  }

  return { status: 200, body: serializeWorkShift(shift) };
}

export async function updateWorkShift(shiftId, payload) {
  if (!shiftId || !mongoose.Types.ObjectId.isValid(shiftId)) {
    return { status: 400, body: { message: "Invalid work shift" } };
  }

  const existing = await WorkShift.findById(shiftId);
  if (!existing) {
    return { status: 404, body: { message: "Work shift not found" } };
  }

  const {
    roomId,
    dayOfWeek,
    startTime,
    endTime,
    maxPatients,
    slotDurationMin,
    isActive,
  } = payload;

  const day =
    dayOfWeek !== undefined && dayOfWeek !== null && dayOfWeek !== ""
      ? Number(dayOfWeek)
      : existing.dayOfWeek;
  if (!Number.isInteger(day) || day < 0 || day > 6) {
    return { status: 400, body: { message: "Day of week must be from 0 (Sun) to 6 (Sat)" } };
  }

  const start = startTime !== undefined ? String(startTime).trim() : existing.startTime;
  const end = endTime !== undefined ? String(endTime).trim() : existing.endTime;
  if (!isValidTimeString(start) || !isValidTimeString(end)) {
    return { status: 400, body: { message: "Start/end time must use HH:mm format" } };
  }
  if (timeToMinutes(end) <= timeToMinutes(start)) {
    return { status: 400, body: { message: "End time must be after start time" } };
  }

  const capacity =
    maxPatients !== undefined && maxPatients !== null && maxPatients !== ""
      ? parseInt(maxPatients, 10)
      : existing.maxPatients;
  if (!capacity || capacity < 1) {
    return { status: 400, body: { message: "Maximum patients must be >= 1" } };
  }

  let roomObjectId = existing.roomId;
  if (roomId !== undefined) {
    if (roomId === null || roomId === "") {
      roomObjectId = null;
    } else {
      if (!mongoose.Types.ObjectId.isValid(roomId)) {
        return { status: 400, body: { message: "Invalid clinic room" } };
      }
      const room = await ClinicRoom.findById(roomId);
      if (!room || !room.isActive) {
        return { status: 404, body: { message: "Active clinic room not found" } };
      }
      roomObjectId = room._id;
    }
  }

  const nextIsActive = isActive !== undefined ? isActive !== false : existing.isActive;

  if (nextIsActive) {
    const overlap = await findOverlappingShift({
      doctorId: existing.doctorId,
      dayOfWeek: day,
      startTime: start,
      endTime: end,
      excludeId: existing._id,
    });
    if (overlap) {
      return {
        status: 409,
        body: {
          message: "Shift overlaps with an existing shift for this doctor on the same day",
          conflict: {
            shiftId: overlap._id.toString(),
            startTime: overlap.startTime,
            endTime: overlap.endTime,
          },
        },
      };
    }
  }

  const duration =
    slotDurationMin != null && slotDurationMin !== ""
      ? parseInt(slotDurationMin, 10)
      : computeSlotDurationMin(start, end, capacity);

  if (!duration || duration < 15) {
    return { status: 400, body: { message: "Each slot duration must be >= 15 minutes" } };
  }

  existing.dayOfWeek = day;
  existing.startTime = start;
  existing.endTime = end;
  existing.maxPatients = capacity;
  existing.slotDurationMin = duration;
  existing.roomId = roomObjectId;
  existing.isActive = nextIsActive;
  await existing.save();

  const populated = await shiftQuery().findById(existing._id).lean();
  return {
    status: 200,
    body: {
      ...serializeWorkShift(populated),
      note: "Future appointment slots may need regeneration after this change.",
    },
  };
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export async function deleteWorkShift(shiftId) {
  if (!shiftId || !mongoose.Types.ObjectId.isValid(shiftId)) {
    return { status: 400, body: { message: "Invalid work shift" } };
  }

  const existing = await WorkShift.findById(shiftId);
  if (!existing) {
    return { status: 404, body: { message: "Work shift not found" } };
  }

  const futureBookedCount = await AppointmentSlot.countDocuments({
    workShiftId: existing._id,
    status: "booked",
    date: { $gte: startOfToday() },
  });

  if (futureBookedCount > 0) {
    return {
      status: 409,
      body: {
        message: "Cannot delete work shift because future appointments are booked",
        futureBookings: futureBookedCount,
      },
    };
  }

  await AppointmentSlot.deleteMany({
    workShiftId: existing._id,
    date: { $gte: startOfToday() },
    status: { $in: ["available", "blocked"] },
  });

  await existing.deleteOne();

  return {
    status: 200,
    body: {
      message: "Work shift deleted",
      deletedShiftId: shiftId,
    },
  };
}
