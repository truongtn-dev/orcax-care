import mongoose from "mongoose";
import { AppointmentSlot } from "../models/AppointmentSlot.js";
import { Holiday } from "../models/Holiday.js";
import { WorkShift } from "../models/WorkShift.js";
import { buildSlotTimes, eachDateInclusive, parseDateOnly } from "../utils/shiftTime.js";

function normalizeDay(date) {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
}

async function loadHolidayDates(startDate, endDate) {
  const holidays = await Holiday.find({
    isActive: true,
    date: { $gte: startDate, $lte: endDate },
  })
    .select("date")
    .lean();

  return new Set(holidays.map((item) => normalizeDay(item.date).getTime()));
}

export async function generateAppointmentSlots(payload = {}) {
  const { startDate, endDate, doctorId = "", workShiftId = "" } = payload;

  const rangeStart = parseDateOnly(startDate);
  const rangeEnd = parseDateOnly(endDate);
  if (!rangeStart || !rangeEnd) {
    return { status: 400, body: { message: "Ngày bắt đầu/kết thúc phải theo định dạng YYYY-MM-DD" } };
  }
  if (rangeEnd < rangeStart) {
    return { status: 400, body: { message: "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu" } };
  }

  const shiftFilter = { isActive: true };
  if (doctorId) {
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return { status: 400, body: { message: "Bác sĩ không hợp lệ" } };
    }
    shiftFilter.doctorId = new mongoose.Types.ObjectId(doctorId);
  }
  if (workShiftId) {
    if (!mongoose.Types.ObjectId.isValid(workShiftId)) {
      return { status: 400, body: { message: "Ca làm việc không hợp lệ" } };
    }
    shiftFilter._id = new mongoose.Types.ObjectId(workShiftId);
  }

  const shifts = await WorkShift.find(shiftFilter).lean();
  if (!shifts.length) {
    return { status: 404, body: { message: "Không tìm thấy ca làm việc phù hợp để sinh slot" } };
  }

  const holidayDates = await loadHolidayDates(rangeStart, rangeEnd);
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
        startDate: startDate.trim(),
        endDate: endDate.trim(),
      },
      filters: {
        doctorId: doctorId || null,
        workShiftId: workShiftId || null,
      },
    },
  };
}
