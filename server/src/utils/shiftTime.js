const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidTimeString(value) {
  return typeof value === "string" && TIME_PATTERN.test(value.trim());
}

export function timeToMinutes(value) {
  const [hours, minutes] = value.trim().split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function doTimeRangesOverlap(startA, endA, startB, endB) {
  const aStart = timeToMinutes(startA);
  const aEnd = timeToMinutes(endA);
  const bStart = timeToMinutes(startB);
  const bEnd = timeToMinutes(endB);
  return aStart < bEnd && bStart < aEnd;
}

export function computeSlotDurationMin(startTime, endTime, maxPatients) {
  const span = timeToMinutes(endTime) - timeToMinutes(startTime);
  if (span <= 0 || maxPatients <= 0) return 0;
  return Math.max(15, Math.floor(span / maxPatients));
}

export function buildSlotTimes(startTime, endTime, slotDurationMin, maxPatients) {
  const slots = [];
  let cursor = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  const duration = parseInt(slotDurationMin, 10);

  for (let i = 0; i < maxPatients && cursor + duration <= end; i += 1) {
    slots.push({
      startTime: minutesToTime(cursor),
      endTime: minutesToTime(cursor + duration),
    });
    cursor += duration;
  }

  return slots;
}

export function formatDateOnly(date) {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "";
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateOnly(value) {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const date = new Date(`${trimmed}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function eachDateInclusive(startDate, endDate) {
  const dates = [];
  const cursor = new Date(startDate);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (cursor <= end) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

export function startOfToday() {
  const day = new Date();
  day.setHours(0, 0, 0, 0);
  return day;
}

/** True when the slot start is before now (past calendar day, or earlier time today). */
export function isSlotDatetimePast(date, startTime) {
  if (!date || !isValidTimeString(startTime)) return false;

  const slotDay = new Date(date);
  slotDay.setHours(0, 0, 0, 0);
  const today = startOfToday();

  if (slotDay < today) return true;
  if (slotDay > today) return false;

  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  return timeToMinutes(startTime) <= nowMinutes;
}

export const DAY_OF_WEEK_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
