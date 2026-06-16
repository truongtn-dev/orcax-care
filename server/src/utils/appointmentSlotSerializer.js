import { formatDateOnly, isSlotDatetimePast } from "./shiftTime.js";

const STATUS_LABELS = {
  available: "Available",
  booked: "Booked",
  blocked: "Blocked",
};

function formatPublicRoomLabel(room) {
  if (!room || typeof room !== "object") return "";
  const code = room.roomNumber || room.roomCode;
  if (!code) return "";
  return `Room ${code}`;
}

export function serializeSlot(slot, { publicView = false } = {}) {
  const room = slot.roomId;
  const roomLabel = formatPublicRoomLabel(room);

  const base = {
    _id: slot._id.toString(),
    date: formatDateOnly(slot.date),
    startTime: slot.startTime,
    endTime: slot.endTime,
    roomLabel,
  };

  if (publicView) {
    return base;
  }

  return {
    ...base,
    roomName: room?.name || "",
    workShiftId: slot.workShiftId?.toString() || "",
    roomId: room?._id?.toString() || slot.roomId?.toString() || null,
    status: slot.status,
    statusLabel: STATUS_LABELS[slot.status] || slot.status,
    isPast: isSlotDatetimePast(slot.date, slot.startTime),
    createdAt: slot.createdAt,
    updatedAt: slot.updatedAt,
  };
}

export function groupSlotsByDate(slots, options = {}) {
  const buckets = new Map();

  for (const slot of slots) {
    const dateKey = formatDateOnly(slot.date);
    if (!buckets.has(dateKey)) {
      buckets.set(dateKey, []);
    }
    buckets.get(dateKey).push(serializeSlot(slot, options));
  }

  for (const daySlots of buckets.values()) {
    daySlots.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  return buckets;
}

export function buildDayEntries(startDate, endDate, buckets) {
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

export function summarizeSlots(slots) {
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

export function summarizePublicSlots(slots) {
  return { available: slots.length };
}
