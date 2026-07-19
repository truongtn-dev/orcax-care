import { Appointment } from "../models/Appointment.js";
import { User } from "../models/User.js";
import { sendAppointmentReminderEmail } from "../services/mail.service.js";
import {
  buildAppointmentVisitLabel,
  notifyPatientSafe,
} from "../services/notification.service.js";
import { formatDateOnly, timeToMinutes } from "../utils/shiftTime.js";

const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;
const INTERVAL_MS = 15 * 60 * 1000;

function slotDateTime(slot) {
  if (!slot?.date || !slot?.startTime) return null;
  const day = new Date(slot.date);
  day.setHours(0, 0, 0, 0);
  const minutes = timeToMinutes(String(slot.startTime).trim());
  if (!Number.isFinite(minutes)) return null;
  return new Date(day.getTime() + minutes * 60 * 1000);
}

export async function runAppointmentReminders() {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MS);
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(windowEnd);
  dayEnd.setHours(23, 59, 59, 999);

  const candidates = await Appointment.find({
    status: { $in: ["confirmed", "checked-in"] },
    reminderSentAt: null,
  })
    .populate({
      path: "slotId",
      match: { date: { $gte: dayStart, $lte: dayEnd } },
      populate: { path: "roomId", select: "name" },
    })
    .populate({
      path: "doctorId",
      populate: { path: "userId", select: "fullName" },
    })
    .lean();

  let sent = 0;

  for (const appointment of candidates) {
    const slot = appointment.slotId;
    if (!slot) continue;

    const startsAt = slotDateTime(slot);
    if (!startsAt || startsAt < now || startsAt > windowEnd) continue;

    const patient = await User.findById(appointment.patientUserId).select("fullName email").lean();
    if (!patient) continue;

    const doctorName = appointment.doctorId?.userId?.fullName || "your doctor";
    const visitLabel = buildAppointmentVisitLabel(slot);
    const title = "Appointment reminder";
    const message = `Reminder: your visit with ${doctorName} is scheduled for ${visitLabel}. Please arrive a few minutes early.`;

    await Appointment.updateOne(
      { _id: appointment._id, reminderSentAt: null },
      { $set: { reminderSentAt: new Date() } }
    );

    notifyPatientSafe(appointment.patientUserId, {
      title,
      message,
      type: "appointment",
      link: "/patient/appointments",
    });

    sendAppointmentReminderEmail(patient, {
      doctorName,
      visitLabel,
      dateKey: formatDateOnly(slot.date),
      startTime: slot.startTime,
    }).catch((err) => {
      console.error("[reminder] email failed:", err?.message || err);
    });

    sent += 1;
  }

  if (sent > 0) {
    console.log(`[reminder] Sent ${sent} appointment reminder(s)`);
  }

  return { sent };
}

let timer = null;

export function startAppointmentReminderJob() {
  if (timer) return;
  const tick = () => {
    runAppointmentReminders().catch((err) => {
      console.error("[reminder] job failed:", err?.message || err);
    });
  };
  tick();
  timer = setInterval(tick, INTERVAL_MS);
  if (typeof timer.unref === "function") timer.unref();
  console.log(`[reminder] Scheduled every ${INTERVAL_MS / 60000} minutes`);
}
