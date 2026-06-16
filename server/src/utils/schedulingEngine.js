/**
 * Scheduling engine — interval overlap, room conflict, holiday-aware batch planning,
 * idempotent slot generation preview, and delta regeneration after shift updates.
 */
import mongoose from "mongoose";
import { AppointmentSlot } from "../models/AppointmentSlot.js";
import { Holiday } from "../models/Holiday.js";
import { WorkShift } from "../models/WorkShift.js";
import {
  buildSlotTimes,
  computeSlotDurationMin,
  doTimeRangesOverlap,
  eachDateInclusive,
  formatDateOnly,
  parseDateOnly,
  timeToMinutes,
} from "./shiftTime.js";

export function normalizeDay(date) {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
}

export function startOfToday() {
  return normalizeDay(new Date());
}

export async function loadHolidayDateSet(startDate, endDate) {
  const holidays = await Holiday.find({
    isActive: true,
    date: { $gte: startDate, $lte: endDate },
  })
    .select("date name")
    .lean();

  const byKey = new Map();
  for (const item of holidays) {
    const key = normalizeDay(item.date).getTime();
    byKey.set(key, item.name || "Holiday");
  }
  return byKey;
}

export function planShiftSlots({ startTime, endTime, maxPatients, slotDurationMin }) {
  const duration =
    slotDurationMin != null && slotDurationMin !== ""
      ? parseInt(slotDurationMin, 10)
      : computeSlotDurationMin(startTime, endTime, maxPatients);

  const slotTimes = buildSlotTimes(startTime, endTime, duration, maxPatients);
  const spanMin = timeToMinutes(endTime) - timeToMinutes(startTime);

  return {
    slotDurationMin: duration,
    slotCount: slotTimes.length,
    slotTimes,
    shiftSpanMinutes: spanMin,
    utilizationPercent:
      spanMin > 0
        ? Math.round((slotTimes.length * duration * 100) / spanMin)
        : 0,
  };
}

export async function findDoctorShiftOverlap({
  doctorId,
  dayOfWeek,
  startTime,
  endTime,
  excludeShiftId = null,
}) {
  const filter = {
    doctorId,
    dayOfWeek,
    isActive: true,
  };
  if (excludeShiftId) {
    filter._id = { $ne: excludeShiftId };
  }

  const existing = await WorkShift.find(filter).lean();
  return existing.find((shift) =>
    doTimeRangesOverlap(startTime, endTime, shift.startTime, shift.endTime)
  );
}

export async function findRoomShiftConflict({
  roomId,
  dayOfWeek,
  startTime,
  endTime,
  excludeShiftId = null,
  excludeDoctorId = null,
}) {
  if (!roomId) return null;

  const filter = {
    roomId,
    dayOfWeek,
    isActive: true,
  };
  if (excludeShiftId) {
    filter._id = { $ne: excludeShiftId };
  }
  if (excludeDoctorId) {
    filter.doctorId = { $ne: excludeDoctorId };
  }

  const existing = await WorkShift.find(filter)
    .populate({ path: "doctorId", populate: { path: "userId", select: "fullName" } })
    .lean();

  const conflict = existing.find((shift) =>
    doTimeRangesOverlap(startTime, endTime, shift.startTime, shift.endTime)
  );

  if (!conflict) return null;

  return {
    shiftId: conflict._id.toString(),
    doctorName: conflict.doctorId?.userId?.fullName || "",
    startTime: conflict.startTime,
    endTime: conflict.endTime,
  };
}

export async function validateShiftTemplate(input) {
  const {
    doctorId,
    roomId = null,
    dayOfWeek,
    startTime,
    endTime,
    maxPatients,
    slotDurationMin,
    excludeShiftId = null,
  } = input;

  const plan = planShiftSlots({ startTime, endTime, maxPatients, slotDurationMin });
  const issues = [];

  if (!plan.slotDurationMin || plan.slotDurationMin < 15) {
    issues.push({
      code: "SLOT_DURATION_TOO_SHORT",
      message: "Each slot duration must be >= 15 minutes",
    });
  }

  if (plan.slotCount < 1) {
    issues.push({
      code: "NO_SLOTS_FIT",
      message: "Shift window is too short for at least one appointment slot",
    });
  }

  const doctorOverlap = await findDoctorShiftOverlap({
    doctorId,
    dayOfWeek,
    startTime,
    endTime,
    excludeShiftId,
  });
  if (doctorOverlap) {
    issues.push({
      code: "DOCTOR_OVERLAP",
      message: "Shift overlaps with an existing shift for this doctor on the same day",
      conflict: {
        shiftId: doctorOverlap._id.toString(),
        startTime: doctorOverlap.startTime,
        endTime: doctorOverlap.endTime,
      },
    });
  }

  const roomConflict = await findRoomShiftConflict({
    roomId,
    dayOfWeek,
    startTime,
    endTime,
    excludeShiftId,
    excludeDoctorId: doctorId,
  });
  if (roomConflict) {
    issues.push({
      code: "ROOM_CONFLICT",
      message: "Another doctor is already assigned to this room at overlapping hours",
      conflict: roomConflict,
    });
  }

  return {
    valid: issues.length === 0,
    issues,
    plan,
  };
}

function buildShiftFilter({ doctorId = "", workShiftId = "" } = {}) {
  const shiftFilter = { isActive: true };
  if (doctorId) {
    shiftFilter.doctorId = new mongoose.Types.ObjectId(doctorId);
  }
  if (workShiftId) {
    shiftFilter._id = new mongoose.Types.ObjectId(workShiftId);
  }
  return shiftFilter;
}

export async function simulateSlotGeneration(payload = {}) {
  const { startDate, endDate, doctorId = "", workShiftId = "" } = payload;

  const rangeStart = parseDateOnly(startDate);
  const rangeEnd = parseDateOnly(endDate);
  if (!rangeStart || !rangeEnd) {
    return { error: { status: 400, body: { message: "Start/end date must use YYYY-MM-DD format" } } };
  }
  if (rangeEnd < rangeStart) {
    return { error: { status: 400, body: { message: "End date must be on or after start date" } } };
  }

  const shifts = await WorkShift.find(buildShiftFilter({ doctorId, workShiftId })).lean();
  if (!shifts.length) {
    return { error: { status: 404, body: { message: "No matching work shift found" } } };
  }

  const holidayDates = await loadHolidayDateSet(rangeStart, rangeEnd);
  const calendarDays = eachDateInclusive(rangeStart, rangeEnd);

  let wouldCreate = 0;
  let wouldSkipExisting = 0;
  let holidaysSkipped = 0;
  let workingDays = 0;
  const sampleDates = [];
  const shiftsProcessed = new Set();

  for (const day of calendarDays) {
    const dayKey = normalizeDay(day).getTime();
    if (holidayDates.has(dayKey)) {
      holidaysSkipped += 1;
      continue;
    }

    const dayOfWeek = day.getDay();
    const dayShifts = shifts.filter((shift) => shift.dayOfWeek === dayOfWeek);
    if (!dayShifts.length) continue;

    workingDays += 1;
    if (sampleDates.length < 5) {
      sampleDates.push(formatDateOnly(day));
    }

    for (const shift of dayShifts) {
      shiftsProcessed.add(shift._id.toString());
      const slotTimes = buildSlotTimes(
        shift.startTime,
        shift.endTime,
        shift.slotDurationMin,
        shift.maxPatients
      );

      for (const slot of slotTimes) {
        const exists = await AppointmentSlot.findOne({
          doctorId: shift.doctorId,
          date: day,
          startTime: slot.startTime,
        })
          .select("_id status")
          .lean();

        if (exists) {
          wouldSkipExisting += 1;
        } else {
          wouldCreate += 1;
        }
      }
    }
  }

  return {
    wouldCreate,
    wouldSkipExisting,
    holidaysSkipped,
    workingDays,
    calendarDays: calendarDays.length,
    shiftsProcessed: shiftsProcessed.size,
    sampleDates,
    holidayNames: [...holidayDates.values()].slice(0, 5),
  };
}

export async function analyzeDeleteShiftImpact(shiftId) {
  const today = startOfToday();
  const [futureBooked, futureAvailable, futureBlocked] = await Promise.all([
    AppointmentSlot.countDocuments({
      workShiftId: shiftId,
      status: "booked",
      date: { $gte: today },
    }),
    AppointmentSlot.countDocuments({
      workShiftId: shiftId,
      status: "available",
      date: { $gte: today },
    }),
    AppointmentSlot.countDocuments({
      workShiftId: shiftId,
      status: "blocked",
      date: { $gte: today },
    }),
  ]);

  return {
    canDelete: futureBooked === 0,
    futureBooked,
    futureAvailable,
    futureBlocked,
    slotsRemovedIfDeleted: futureAvailable + futureBlocked,
  };
}

export async function regenerateFutureSlotsForShift(shift, { horizonDays = 60 } = {}) {
  const today = startOfToday();
  const rangeEnd = new Date(today);
  rangeEnd.setDate(rangeEnd.getDate() + horizonDays);

  const holidayDates = await loadHolidayDateSet(today, rangeEnd);
  const calendarDays = eachDateInclusive(today, rangeEnd).filter(
    (day) => day.getDay() === shift.dayOfWeek
  );

  const targetSlotTimes = buildSlotTimes(
    shift.startTime,
    shift.endTime,
    shift.slotDurationMin,
    shift.maxPatients
  );
  const targetKeys = new Set(targetSlotTimes.map((slot) => slot.startTime));

  let removed = 0;
  let created = 0;
  let preservedBooked = 0;
  let holidaysSkipped = 0;

  for (const day of calendarDays) {
    if (holidayDates.has(normalizeDay(day).getTime())) {
      holidaysSkipped += 1;
      continue;
    }

    const existingSlots = await AppointmentSlot.find({
      workShiftId: shift._id,
      date: day,
    });

    for (const slot of existingSlots) {
      if (slot.status === "booked") {
        preservedBooked += 1;
        continue;
      }
      if (!targetKeys.has(slot.startTime)) {
        await slot.deleteOne();
        removed += 1;
      }
    }

    const existingKeys = new Set(
      existingSlots.map((slot) => slot.startTime)
    );

    for (const slotTime of targetSlotTimes) {
      if (existingKeys.has(slotTime.startTime)) continue;

      const duplicate = await AppointmentSlot.findOne({
        doctorId: shift.doctorId,
        date: day,
        startTime: slotTime.startTime,
      })
        .select("_id")
        .lean();
      if (duplicate) continue;

      await AppointmentSlot.create({
        doctorId: shift.doctorId,
        workShiftId: shift._id,
        roomId: shift.roomId || null,
        date: day,
        startTime: slotTime.startTime,
        endTime: slotTime.endTime,
        status: "available",
      });
      created += 1;
    }
  }

  return {
    removed,
    created,
    preservedBooked,
    holidaysSkipped,
    horizonDays,
    targetSlotCount: targetSlotTimes.length,
  };
}
