import mongoose from "mongoose";
import { AppointmentSlot } from "../models/AppointmentSlot.js";
import { WorkShift } from "../models/WorkShift.js";
import { buildSlotTimes, eachDateInclusive, formatDateOnly } from "../utils/shiftTime.js";
import {
  loadHolidayDateSet,
  normalizeDay,
  resolveGenerationDateRange,
  simulateSlotGeneration,
} from "../utils/schedulingEngine.js";

function buildShiftFilter({ doctorId = "", workShiftId = "" } = {}) {
  const shiftFilter = { isActive: true };
  if (doctorId) {
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return { error: "Invalid doctor" };
    }
    shiftFilter.doctorId = new mongoose.Types.ObjectId(doctorId);
  }
  if (workShiftId) {
    if (!mongoose.Types.ObjectId.isValid(workShiftId)) {
      return { error: "Invalid work shift" };
    }
    shiftFilter._id = new mongoose.Types.ObjectId(workShiftId);
  }
  return { shiftFilter };
}

export async function previewAppointmentSlots(payload = {}) {
  const simulation = await simulateSlotGeneration(payload);
  if (simulation.error) return simulation.error;

  return {
    status: 200,
    body: {
      preview: true,
      ...simulation,
      range: {
        startDate: String(payload.startDate || "").trim(),
        endDate: String(payload.endDate || "").trim(),
      },
      filters: {
        doctorId: payload.doctorId || null,
        workShiftId: payload.workShiftId || null,
      },
    },
  };
}

export async function generateAppointmentSlots(payload = {}) {
  const { startDate, endDate, doctorId = "", workShiftId = "" } = payload;

  const resolved = resolveGenerationDateRange(startDate, endDate);
  if (resolved.error) {
    return resolved.error;
  }
  const { rangeStart, rangeEnd, startDateClamped } = resolved;

  const built = buildShiftFilter({ doctorId, workShiftId });
  if (built.error) {
    return { status: 400, body: { message: built.error } };
  }

  const shifts = await WorkShift.find(built.shiftFilter).lean();
  if (!shifts.length) {
    return { status: 404, body: { message: "No matching work shift found to generate slots" } };
  }

  const holidayDates = await loadHolidayDateSet(rangeStart, rangeEnd);
  const calendarDays = eachDateInclusive(rangeStart, rangeEnd);

  let created = 0;
  let skipped = 0;
  let holidaysSkipped = 0;
  const shiftsProcessed = new Set();

  for (const day of calendarDays) {
    const dayKey = normalizeDay(day).getTime();
    if (holidayDates.has(dayKey)) {
      holidaysSkipped += 1;
      continue;
    }

    const dayOfWeek = day.getDay();
    const dayShifts = shifts.filter((shift) => shift.dayOfWeek === dayOfWeek);

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
          .select("_id")
          .lean();

        if (exists) {
          skipped += 1;
          continue;
        }

        await AppointmentSlot.create({
          doctorId: shift.doctorId,
          workShiftId: shift._id,
          roomId: shift.roomId || null,
          date: day,
          startTime: slot.startTime,
          endTime: slot.endTime,
          status: "available",
        });
        created += 1;
      }
    }
  }

  return {
    status: 201,
    body: {
      created,
      skipped,
      holidaysSkipped,
      shiftsProcessed: shiftsProcessed.size,
      range: {
        startDate: formatDateOnly(rangeStart),
        endDate: formatDateOnly(rangeEnd),
        startDateClamped,
      },
      filters: {
        doctorId: doctorId || null,
        workShiftId: workShiftId || null,
      },
    },
  };
}
