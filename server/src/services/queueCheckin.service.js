import mongoose from "mongoose";
import { Appointment } from "../models/Appointment.js";
import { AppointmentSlot } from "../models/AppointmentSlot.js";
import { QueueAuditLog } from "../models/QueueAuditLog.js";
import { QueueSession } from "../models/QueueSession.js";
import { QueueTicket } from "../models/QueueTicket.js";
import { User } from "../models/User.js";
import { emitQueueEvent } from "../realtime/socket.js";
import { endOfToday, startOfToday } from "../utils/queueDate.js";
import { broadcastSessionUpdate, serializeTicket } from "./queueSession.service.js";

function formatReferenceCode(appointmentId) {
  const value = appointmentId?.toString() || "";
  if (!value) return "";
  return `APT-${value.slice(-6).toUpperCase()}`;
}

function serializeAppointmentCard(appointment) {
  const patient = appointment.patientUserId;
  const slot = appointment.slotId;
  const room = slot?.roomId;
  const id = appointment._id.toString();

  return {
    _id: id,
    referenceCode: formatReferenceCode(id),
    status: appointment.status,
    reason: appointment.reason || "",
    fee: appointment.fee,
    patientName: patient?.fullName || "",
    patientPhone: patient?.phone || "",
    patientEmail: patient?.email || "",
    slot: slot
      ? {
          _id: slot._id.toString(),
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          roomId: room?._id?.toString() || room?.toString() || null,
          roomName: room?.name || "",
        }
      : null,
  };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesReferenceCode(appointmentId, query) {
  const normalized = query.trim().toUpperCase();
  if (!normalized.startsWith("APT-")) return false;
  const suffix = normalized.replace("APT-", "");
  return formatReferenceCode(appointmentId).toUpperCase().includes(suffix);
}

export async function searchTodayAppointments(keyword) {
  const query = (keyword || "").trim();
  if (!query) {
    return { status: 400, body: { message: "Search keyword is required." } };
  }

  const todayStart = startOfToday();
  const todayEnd = endOfToday();

  const slotsToday = await AppointmentSlot.find({
    date: { $gte: todayStart, $lt: todayEnd },
  })
    .select("_id")
    .lean();

  const slotIds = slotsToday.map((slot) => slot._id);
  if (!slotIds.length) {
    return { status: 404, body: { message: "No confirmed appointment found for today." } };
  }

  const phoneDigits = query.replace(/\D/g, "");
  const filters = [{ status: "confirmed", slotId: { $in: slotIds } }];
  const patientFilters = [
    { fullName: { $regex: escapeRegex(query), $options: "i" } },
    { email: { $regex: escapeRegex(query), $options: "i" } },
  ];

  if (phoneDigits) {
    patientFilters.push({ phone: { $regex: phoneDigits } });
  }

  const patientUsers = await User.find({
    role: "patient",
    $or: patientFilters,
  })
    .select("_id")
    .lean();

  const orFilters = [{ reason: { $regex: escapeRegex(query), $options: "i" } }];
  if (patientUsers.length) {
    orFilters.push({ patientUserId: { $in: patientUsers.map((user) => user._id) } });
  }

  let appointments = await Appointment.find({ ...filters[0], $or: orFilters })
    .populate("patientUserId", "fullName email phone")
    .populate({
      path: "slotId",
      select: "date startTime endTime roomId",
      populate: { path: "roomId", select: "name roomCode roomNumber" },
    })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  if (query.toUpperCase().startsWith("APT-")) {
    appointments = appointments.filter((item) => matchesReferenceCode(item._id, query));
  }

  if (!appointments.length) {
    return { status: 404, body: { message: "No confirmed appointment found for today." } };
  }

  return {
    status: 200,
    body: {
      appointments: appointments.map(serializeAppointmentCard),
    },
  };
}

export async function issueQueueTicket(staffUserId, appointmentId) {
  if (!appointmentId || !mongoose.Types.ObjectId.isValid(appointmentId)) {
    return { status: 400, body: { message: "Valid appointmentId is required." } };
  }

  const appointment = await Appointment.findById(appointmentId)
    .populate("patientUserId", "fullName email phone")
    .populate({
      path: "slotId",
      select: "date startTime endTime roomId",
      populate: { path: "roomId", select: "name roomCode roomNumber" },
    });

  if (!appointment) {
    return { status: 404, body: { message: "Appointment not found." } };
  }

  if (appointment.status !== "confirmed") {
    return { status: 409, body: { message: "Only confirmed appointments can be checked in." } };
  }

  const slot = appointment.slotId;
  const roomId = slot?.roomId?._id || slot?.roomId;
  if (!roomId) {
    return { status: 409, body: { message: "Appointment has no assigned clinic room." } };
  }

  const todayStart = startOfToday();
  const todayEnd = endOfToday();
  const slotDate = new Date(slot.date);
  if (slotDate < todayStart || slotDate >= todayEnd) {
    return { status: 409, body: { message: "Appointment is not scheduled for today." } };
  }

  const existingTicket = await QueueTicket.findOne({
    appointmentId: appointment._id,
    createdAt: { $gte: todayStart, $lt: todayEnd },
    status: { $nin: ["no-show", "done"] },
  }).lean();

  if (existingTicket) {
    return { status: 409, body: { message: "A queue ticket already exists for this appointment today." } };
  }

  const session = await QueueSession.findOneAndUpdate(
    {
      roomId,
      date: todayStart,
      status: "open",
    },
    { $inc: { lastNumber: 1 } },
    { new: true }
  )
    .populate("roomId", "name roomCode roomNumber floor")
    .lean();

  if (!session) {
    return { status: 409, body: { message: "Queue session is not active for this room." } };
  }

  const ticket = await QueueTicket.create({
    sessionId: session._id,
    appointmentId: appointment._id,
    patientUserId: appointment.patientUserId._id || appointment.patientUserId,
    number: session.lastNumber,
    status: "waiting",
  });

  appointment.status = "checked-in";
  await appointment.save();

  await QueueAuditLog.create({
    sessionId: session._id,
    ticketId: ticket._id,
    action: "issue_ticket",
    actorUserId: staffUserId,
    metadata: { number: ticket.number, appointmentId: appointment._id.toString() },
  });

  const sessionPayload = await broadcastSessionUpdate(session);

  emitQueueEvent(
    { patientUserId: ticket.patientUserId.toString() },
    "queue:patient-update",
    {
      ticket: serializeTicket(ticket),
      session: sessionPayload,
    }
  );

  return {
    status: 201,
    body: {
      ticket: serializeTicket(ticket),
      session: sessionPayload,
      appointment: serializeAppointmentCard(appointment.toObject()),
    },
  };
}
