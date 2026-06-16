import mongoose from "mongoose";
import { ClinicRoom } from "../models/ClinicRoom.js";
import { Doctor } from "../models/Doctor.js";
import { AppointmentSlot } from "../models/AppointmentSlot.js";
import { WorkShift } from "../models/WorkShift.js";
import {
  DAY_OF_WEEK_LABELS,
  isValidTimeString,
  timeToMinutes,
} from "../utils/shiftTime.js";
import {
  analyzeDeleteShiftImpact,
  planShiftSlots,
  regenerateFutureSlotsForShift,
  startOfToday,
  validateShiftTemplate,
} from "../utils/schedulingEngine.js";

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

async function loadDoctorAndRoom(doctorId, roomId) {
  if (!doctorId || !mongoose.Types.ObjectId.isValid(doctorId)) {
    return { error: { status: 400, body: { message: "Invalid doctor" } } };
  }

  const doctor = await Doctor.findById(doctorId).populate("userId", "fullName isActive");
  if (!doctor || !doctor.isActive) {
    return { error: { status: 404, body: { message: "Active doctor not found" } } };
  }
  if (!doctor.userId?.isActive) {
    return { error: { status: 400, body: { message: "Doctor account is not activated" } } };
  }

  let roomObjectId = null;
  if (roomId) {
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return { error: { status: 400, body: { message: "Invalid clinic room" } } };
    }
    const room = await ClinicRoom.findById(roomId);
    if (!room || !room.isActive) {
      return { error: { status: 404, body: { message: "Active clinic room not found" } } };
    }
    roomObjectId = room._id;
  }

  return { doctor, roomObjectId };
}

function parseShiftTiming(payload, fallback = {}) {
  const day =
    payload.dayOfWeek !== undefined && payload.dayOfWeek !== null && payload.dayOfWeek !== ""
      ? Number(payload.dayOfWeek)
      : fallback.dayOfWeek;
  if (!Number.isInteger(day) || day < 0 || day > 6) {
    return { error: { status: 400, body: { message: "Day of week must be from 0 (Sun) to 6 (Sat)" } } };
  }

  const start =
    payload.startTime !== undefined ? String(payload.startTime).trim() : fallback.startTime;
  const end = payload.endTime !== undefined ? String(payload.endTime).trim() : fallback.endTime;
  if (!isValidTimeString(start) || !isValidTimeString(end)) {
    return { error: { status: 400, body: { message: "Start/end time must use HH:mm format" } } };
  }
  if (timeToMinutes(end) <= timeToMinutes(start)) {
    return { error: { status: 400, body: { message: "End time must be after start time" } } };
  }

  const capacity =
    payload.maxPatients !== undefined && payload.maxPatients !== null && payload.maxPatients !== ""
      ? parseInt(payload.maxPatients, 10)
      : fallback.maxPatients;
  if (!capacity || capacity < 1) {
    return { error: { status: 400, body: { message: "Maximum patients must be >= 1" } } };
  }

  return { day, start, end, capacity };
}

export async function previewWorkShift(payload) {
  const timing = parseShiftTiming(payload);
  if (timing.error) return timing.error;

  const loaded = await loadDoctorAndRoom(payload.doctorId, payload.roomId || null);
  if (loaded.error) return loaded.error;

  const validation = await validateShiftTemplate({
    doctorId: loaded.doctor._id,
    roomId: loaded.roomObjectId,
    dayOfWeek: timing.day,
    startTime: timing.start,
    endTime: timing.end,
    maxPatients: timing.capacity,
    slotDurationMin: payload.slotDurationMin,
    excludeShiftId: payload.excludeShiftId || null,
  });

  return {
    status: 200,
    body: {
      valid: validation.valid,
      issues: validation.issues,
      plan: validation.plan,
      dayLabel: DAY_OF_WEEK_LABELS[timing.day] || "",
    },
  };
}

export async function createWorkShift(payload) {
  const timing = parseShiftTiming(payload);
  if (timing.error) return timing.error;

  const loaded = await loadDoctorAndRoom(payload.doctorId, payload.roomId || null);
  if (loaded.error) return loaded.error;

  const validation = await validateShiftTemplate({
    doctorId: loaded.doctor._id,
    roomId: loaded.roomObjectId,
    dayOfWeek: timing.day,
    startTime: timing.start,
    endTime: timing.end,
    maxPatients: timing.capacity,
    slotDurationMin: payload.slotDurationMin,
  });

  if (!validation.valid) {
    const primary = validation.issues[0];
    return {
      status: primary.code === "DOCTOR_OVERLAP" || primary.code === "ROOM_CONFLICT" ? 409 : 400,
      body: {
        message: primary.message,
        issues: validation.issues,
        conflict: primary.conflict || undefined,
      },
    };
  }

  const shift = await WorkShift.create({
    doctorId: loaded.doctor._id,
    roomId: loaded.roomObjectId,
    dayOfWeek: timing.day,
    startTime: timing.start,
    endTime: timing.end,
    maxPatients: timing.capacity,
    slotDurationMin: validation.plan.slotDurationMin,
    isActive: payload.isActive !== false,
  });

  const populated = await shiftQuery().findById(shift._id).lean();
  return {
    status: 201,
    body: {
      ...serializeWorkShift(populated),
      slotPlan: validation.plan,
    },
  };
}

export function buildWeeklyPattern(shifts) {
  const buckets = Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    dayLabel: DAY_OF_WEEK_LABELS[dayOfWeek] || "",
    shifts: [],
    totalCapacity: 0,
    activeCount: 0,
  }));

  for (const shift of shifts) {
    const day = shift.dayOfWeek;
    if (day >= 0 && day <= 6) {
      buckets[day].shifts.push(shift);
      buckets[day].totalCapacity += shift.maxPatients || 0;
      if (shift.isActive !== false) buckets[day].activeCount += 1;
    }
  }

  for (const bucket of buckets) {
    bucket.shifts.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  }

  return buckets;
}

async function resolveDoctorIdsForShiftFilter({ doctorId = "", q = "", specialtyId = "", departmentId = "" } = {}) {
  if (doctorId && mongoose.Types.ObjectId.isValid(doctorId)) {
    return [new mongoose.Types.ObjectId(doctorId)];
  }

  const text = String(q || "").trim().toLowerCase();
  const hasDoctorFilter = Boolean(text || specialtyId || departmentId);
  if (!hasDoctorFilter) return null;

  const doctorFilter = {};
  if (specialtyId && mongoose.Types.ObjectId.isValid(specialtyId)) {
    doctorFilter.specialtyId = new mongoose.Types.ObjectId(specialtyId);
  }
  if (departmentId && mongoose.Types.ObjectId.isValid(departmentId)) {
    doctorFilter.departmentId = new mongoose.Types.ObjectId(departmentId);
  }

  let doctors = await Doctor.find(doctorFilter)
    .populate("userId", "fullName email")
    .populate("specialtyId", "name")
    .populate("departmentId", "name")
    .lean();

  if (text) {
    doctors = doctors.filter((doctor) => {
      const user = doctor.userId || {};
      const specialty = doctor.specialtyId || {};
      const department = doctor.departmentId || {};
      return [user.fullName, user.email, doctor.licenseNo, specialty.name, department.name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(text));
    });
  }

  return doctors.map((doctor) => doctor._id);
}

export async function listWorkShifts({
  doctorId = "",
  q = "",
  specialtyId = "",
  departmentId = "",
  isActive = "",
  page = 1,
  limit = 50,
} = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const filter = {};

  const doctorIds = await resolveDoctorIdsForShiftFilter({ doctorId, q, specialtyId, departmentId });
  if (doctorIds !== null) {
    if (doctorIds.length === 0) {
      return {
        items: [],
        weeklyPattern: buildWeeklyPattern([]),
        summary: { totalShifts: 0, totalWeeklyCapacity: 0, activeDoctors: 0 },
        page: pageNum,
        limit: limitNum,
        total: 0,
        totalPages: 0,
        filters: {
          doctorId: doctorId || null,
          q: q || null,
          specialtyId: specialtyId || null,
          departmentId: departmentId || null,
          isActive: String(isActive || "").trim().toLowerCase() || "all",
        },
      };
    }
    filter.doctorId = doctorIds.length === 1 ? doctorIds[0] : { $in: doctorIds };
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
  const summary = {
    totalShifts: items.length,
    totalWeeklyCapacity: items.reduce((sum, item) => sum + (item.maxPatients || 0), 0),
    activeDoctors: new Set(items.map((item) => item.doctorId)).size,
  };

  return {
    items,
    weeklyPattern,
    summary,
    page: pageNum,
    limit: limitNum,
    total,
    totalPages: Math.ceil(total / limitNum) || 1,
    filters: {
      doctorId: doctorId || null,
      q: q || null,
      specialtyId: specialtyId || null,
      departmentId: departmentId || null,
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

  const serialized = serializeWorkShift(shift);
  return {
    status: 200,
    body: {
      ...serialized,
      slotPlan: planShiftSlots(serialized),
    },
  };
}

export async function updateWorkShift(shiftId, payload) {
  if (!shiftId || !mongoose.Types.ObjectId.isValid(shiftId)) {
    return { status: 400, body: { message: "Invalid work shift" } };
  }

  const existing = await WorkShift.findById(shiftId);
  if (!existing) {
    return { status: 404, body: { message: "Work shift not found" } };
  }

  const timing = parseShiftTiming(payload, existing);
  if (timing.error) return timing.error;

  let roomObjectId = existing.roomId;
  if (payload.roomId !== undefined) {
    if (payload.roomId === null || payload.roomId === "") {
      roomObjectId = null;
    } else {
      if (!mongoose.Types.ObjectId.isValid(payload.roomId)) {
        return { status: 400, body: { message: "Invalid clinic room" } };
      }
      const room = await ClinicRoom.findById(payload.roomId);
      if (!room || !room.isActive) {
        return { status: 404, body: { message: "Active clinic room not found" } };
      }
      roomObjectId = room._id;
    }
  }

  const nextIsActive = payload.isActive !== undefined ? payload.isActive !== false : existing.isActive;

  const validation = await validateShiftTemplate({
    doctorId: existing.doctorId,
    roomId: roomObjectId,
    dayOfWeek: timing.day,
    startTime: timing.start,
    endTime: timing.end,
    maxPatients: timing.capacity,
    slotDurationMin: payload.slotDurationMin,
    excludeShiftId: existing._id,
  });

  if (nextIsActive && !validation.valid) {
    const primary = validation.issues[0];
    return {
      status: primary.code === "DOCTOR_OVERLAP" || primary.code === "ROOM_CONFLICT" ? 409 : 400,
      body: {
        message: primary.message,
        issues: validation.issues,
        conflict: primary.conflict || undefined,
      },
    };
  }

  existing.dayOfWeek = timing.day;
  existing.startTime = timing.start;
  existing.endTime = timing.end;
  existing.maxPatients = timing.capacity;
  existing.slotDurationMin = validation.plan.slotDurationMin;
  existing.roomId = roomObjectId;
  existing.isActive = nextIsActive;
  await existing.save();

  let regeneration = null;
  if (payload.regenerateFutureSlots === true && nextIsActive) {
    regeneration = await regenerateFutureSlotsForShift(existing);
  }

  const populated = await shiftQuery().findById(existing._id).lean();
  const note = regeneration
    ? `Regenerated future slots: ${regeneration.created} created, ${regeneration.removed} removed, ${regeneration.preservedBooked} booked preserved.`
    : "Future appointment slots may need regeneration after this change.";

  return {
    status: 200,
    body: {
      ...serializeWorkShift(populated),
      slotPlan: validation.plan,
      note,
      regeneration,
    },
  };
}

export async function getDeleteShiftImpact(shiftId) {
  if (!shiftId || !mongoose.Types.ObjectId.isValid(shiftId)) {
    return { status: 400, body: { message: "Invalid work shift" } };
  }

  const existing = await WorkShift.findById(shiftId);
  if (!existing) {
    return { status: 404, body: { message: "Work shift not found" } };
  }

  const impact = await analyzeDeleteShiftImpact(existing._id);
  return { status: 200, body: impact };
}

export async function deleteWorkShift(shiftId) {
  if (!shiftId || !mongoose.Types.ObjectId.isValid(shiftId)) {
    return { status: 400, body: { message: "Invalid work shift" } };
  }

  const existing = await WorkShift.findById(shiftId);
  if (!existing) {
    return { status: 404, body: { message: "Work shift not found" } };
  }

  const impact = await analyzeDeleteShiftImpact(existing._id);
  if (!impact.canDelete) {
    return {
      status: 409,
      body: {
        message: "Cannot delete work shift because future appointments are booked",
        futureBookings: impact.futureBooked,
        ...impact,
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
      ...impact,
    },
  };
}
