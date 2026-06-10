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

export const DAY_OF_WEEK_LABELS = [
  "Chủ nhật",
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
];
