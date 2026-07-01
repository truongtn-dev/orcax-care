import mongoose from "mongoose";
import { ClinicRoom } from "../models/ClinicRoom.js";
import { Doctor } from "../models/Doctor.js";
import { QueueAuditLog } from "../models/QueueAuditLog.js";
import { QueueSession } from "../models/QueueSession.js";
import { QueueTicket } from "../models/QueueTicket.js";
import { emitQueueEvent } from "../realtime/socket.js";
import { endOfToday, startOfToday } from "../utils/queueDate.js";

const ACTIVE_SESSION_STATUSES = ["open", "paused"];

async function resolveDoctorForUser(userId) {
  return Doctor.findOne({ userId, isActive: true }).lean();
}

async function assertDoctorOwnsSession(session, doctorId) {
  if (!session || session.doctorId.toString() !== doctorId.toString()) {
    return { status: 404, body: { message: "Queue session not found." } };
  }
  return null;
}

async function writeAudit({ sessionId, ticketId, action, actorUserId, note = "", metadata = null }) {
  await QueueAuditLog.create({
    sessionId,
    ticketId,
    action,
    actorUserId,
    note,
    metadata,
  });
}

function serializeRoom(room) {
  if (!room) return null;
  return {
    _id: room._id.toString(),
    name: room.name,
    roomCode: room.roomCode || "",
    roomNumber: room.roomNumber || "",
    floor: room.floor || "",
  };
}

function serializeTicket(ticket) {
  if (!ticket) return null;
  return {
    _id: ticket._id.toString(),
    sessionId: ticket.sessionId.toString(),
    appointmentId: ticket.appointmentId.toString(),
    patientUserId: ticket.patientUserId.toString(),
    number: ticket.number,
    status: ticket.status,
    calledAt: ticket.calledAt,
    skippedAt: ticket.skippedAt,
    servedAt: ticket.servedAt,
    createdAt: ticket.createdAt,
  };
}

export async function serializeSession(session, { waitingTickets = null, includeRoom = true } = {}) {
  if (!session) return null;

  let room = session.roomId;
  if (includeRoom && room && !room.name) {
    room = await ClinicRoom.findById(session.roomId).select("name roomCode roomNumber floor").lean();
  }

  const payload = {
    _id: session._id.toString(),
    doctorId: session.doctorId.toString(),
    roomId: session.roomId?._id?.toString() || session.roomId.toString(),
    room: serializeRoom(room),
    departmentId: session.departmentId?.toString() || null,
    date: session.date,
    status: session.status,
    currentNumber: session.currentNumber,
    lastNumber: session.lastNumber,
    openedAt: session.openedAt,
    pausedAt: session.pausedAt,
    closedAt: session.closedAt,
    waitingCount: waitingTickets?.length ?? null,
    waitingTickets: waitingTickets?.map(serializeTicket) ?? null,
  };

  return payload;
}

async function loadWaitingTickets(sessionId) {
  return QueueTicket.find({ sessionId, status: "waiting" })
    .sort({ number: 1 })
    .lean();
}

export async function broadcastSessionUpdate(session, extra = {}) {
  const waitingTickets = await loadWaitingTickets(session._id);
  const payload = {
    ...(await serializeSession(session, { waitingTickets })),
    ...extra,
  };

  emitQueueEvent(
    {
      roomId: session.roomId.toString(),
      sessionId: session._id.toString(),
    },
    "queue:update",
    payload
  );

  return payload;
}

export async function listDoctorRooms(userId) {
  const doctor = await resolveDoctorForUser(userId);
  if (!doctor) {
    return { status: 404, body: { message: "Doctor profile not found." } };
  }

  const rooms = await ClinicRoom.find({
    departmentId: doctor.departmentId,
    isActive: true,
    status: "active",
  })
    .sort({ roomNumber: 1, name: 1 })
    .lean();

  return {
    status: 200,
    body: {
      rooms: rooms.map(serializeRoom),
    },
  };
}

export async function getDoctorActiveSession(userId) {
  const doctor = await resolveDoctorForUser(userId);
  if (!doctor) {
    return { status: 404, body: { message: "Doctor profile not found." } };
  }

  const today = startOfToday();
  const session = await QueueSession.findOne({
    doctorId: doctor._id,
    date: today,
    status: { $in: ACTIVE_SESSION_STATUSES },
  })
    .populate("roomId", "name roomCode roomNumber floor")
    .lean();

  if (!session) {
    return { status: 404, body: { message: "No active queue session today." } };
  }

  const waitingTickets = await loadWaitingTickets(session._id);
  return {
    status: 200,
    body: {
      session: await serializeSession(session, { waitingTickets }),
    },
  };
}

export async function openSession(userId, { roomId }) {
  if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
    return { status: 400, body: { message: "Valid roomId is required." } };
  }

  const doctor = await resolveDoctorForUser(userId);
  if (!doctor) {
    return { status: 404, body: { message: "Doctor profile not found." } };
  }

  const room = await ClinicRoom.findOne({
    _id: roomId,
    departmentId: doctor.departmentId,
    isActive: true,
    status: "active",
  }).lean();

  if (!room) {
    return { status: 404, body: { message: "Clinic room not found in your department." } };
  }

  const today = startOfToday();

  const existingDoctorSession = await QueueSession.findOne({
    doctorId: doctor._id,
    date: today,
    status: { $in: ACTIVE_SESSION_STATUSES },
  }).lean();

  if (existingDoctorSession) {
    return {
      status: 409,
      body: { message: "You already have an active queue session today." },
    };
  }

  const existingRoomSession = await QueueSession.findOne({
    roomId: room._id,
    date: today,
    status: { $in: ACTIVE_SESSION_STATUSES },
  }).lean();

  if (existingRoomSession) {
    return {
      status: 409,
      body: { message: "This room already has an active queue session today." },
    };
  }

  const session = await QueueSession.create({
    doctorId: doctor._id,
    roomId: room._id,
    departmentId: room.departmentId,
    date: today,
    status: "open",
    currentNumber: 0,
    lastNumber: 0,
    openedAt: new Date(),
  });

  await writeAudit({
    sessionId: session._id,
    action: "open_session",
    actorUserId: userId,
    metadata: { roomId: room._id.toString() },
  });

  const populated = await QueueSession.findById(session._id)
    .populate("roomId", "name roomCode roomNumber floor")
    .lean();

  const payload = await broadcastSessionUpdate(populated);

  return {
    status: 201,
    body: { session: payload },
  };
}

export async function getSessionById(userId, sessionId, role) {
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    return { status: 400, body: { message: "Invalid session id." } };
  }

  const session = await QueueSession.findById(sessionId)
    .populate("roomId", "name roomCode roomNumber floor")
    .lean();

  if (!session) {
    return { status: 404, body: { message: "Queue session not found." } };
  }

  if (role === "doctor") {
    const doctor = await resolveDoctorForUser(userId);
    if (!doctor || session.doctorId.toString() !== doctor._id.toString()) {
      return { status: 404, body: { message: "Queue session not found." } };
    }
  }

  const waitingTickets = await loadWaitingTickets(session._id);
  return {
    status: 200,
    body: {
      session: await serializeSession(session, { waitingTickets }),
    },
  };
}

export async function callNextTicket(userId, sessionId) {
  const doctor = await resolveDoctorForUser(userId);
  if (!doctor) {
    return { status: 404, body: { message: "Doctor profile not found." } };
  }

  const session = await QueueSession.findById(sessionId);
  if (!session) {
    return { status: 404, body: { message: "Queue session not found." } };
  }

  const ownershipError = await assertDoctorOwnsSession(session, doctor._id);
  if (ownershipError) return ownershipError;

  if (session.status !== "open") {
    return { status: 409, body: { message: "Queue session is not accepting calls." } };
  }

  const ticket = await QueueTicket.findOneAndUpdate(
    { sessionId: session._id, status: "waiting" },
    { status: "called", calledAt: new Date() },
    { sort: { number: 1 }, new: true }
  ).lean();

  if (!ticket) {
    return { status: 404, body: { message: "No waiting tickets." } };
  }

  session.currentNumber = ticket.number;
  await session.save();

  await writeAudit({
    sessionId: session._id,
    ticketId: ticket._id,
    action: "call_next",
    actorUserId: userId,
    metadata: { number: ticket.number },
  });

  const populated = await QueueSession.findById(session._id)
    .populate("roomId", "name roomCode roomNumber floor")
    .lean();

  const sessionPayload = await broadcastSessionUpdate(populated, { calledTicket: serializeTicket(ticket) });

  emitQueueEvent(
    { patientUserId: ticket.patientUserId.toString() },
    "queue:patient-update",
    {
      ticket: serializeTicket(ticket),
      session: sessionPayload,
    }
  );

  return {
    status: 200,
    body: {
      ticket: serializeTicket(ticket),
      session: sessionPayload,
    },
  };
}

export async function recallLastSkipped(userId, sessionId) {
  const doctor = await resolveDoctorForUser(userId);
  if (!doctor) {
    return { status: 404, body: { message: "Doctor profile not found." } };
  }

  const session = await QueueSession.findById(sessionId);
  if (!session) {
    return { status: 404, body: { message: "Queue session not found." } };
  }

  const ownershipError = await assertDoctorOwnsSession(session, doctor._id);
  if (ownershipError) return ownershipError;

  if (session.status !== "open") {
    return { status: 409, body: { message: "Queue session is not accepting recalls." } };
  }

  let ticket = null;
  if (session.lastSkippedTicketId) {
    ticket = await QueueTicket.findOne({
      _id: session.lastSkippedTicketId,
      sessionId: session._id,
      status: "skipped",
    });
  }

  if (!ticket) {
    ticket = await QueueTicket.findOne({ sessionId: session._id, status: "skipped" })
      .sort({ skippedAt: -1, number: -1 });
  }

  if (!ticket) {
    return { status: 404, body: { message: "No skipped ticket to recall." } };
  }

  ticket.status = "called";
  ticket.calledAt = new Date();
  ticket.skippedAt = null;
  await ticket.save();

  session.currentNumber = ticket.number;
  session.lastSkippedTicketId = null;
  await session.save();

  await writeAudit({
    sessionId: session._id,
    ticketId: ticket._id,
    action: "recall",
    actorUserId: userId,
    metadata: { number: ticket.number },
  });

  const populated = await QueueSession.findById(session._id)
    .populate("roomId", "name roomCode roomNumber floor")
    .lean();

  const sessionPayload = await broadcastSessionUpdate(populated, { recalledTicket: serializeTicket(ticket) });

  emitQueueEvent(
    { patientUserId: ticket.patientUserId.toString() },
    "queue:patient-update",
    {
      ticket: serializeTicket(ticket),
      session: sessionPayload,
    }
  );

  return {
    status: 200,
    body: {
      ticket: serializeTicket(ticket),
      session: sessionPayload,
    },
  };
}

export async function markTicketSkipped(userId, sessionId, ticketId) {
  const doctor = await resolveDoctorForUser(userId);
  if (!doctor) {
    return { status: 404, body: { message: "Doctor profile not found." } };
  }

  const session = await QueueSession.findById(sessionId);
  if (!session) {
    return { status: 404, body: { message: "Queue session not found." } };
  }

  const ownershipError = await assertDoctorOwnsSession(session, doctor._id);
  if (ownershipError) return ownershipError;

  const ticket = await QueueTicket.findOne({
    _id: ticketId,
    sessionId: session._id,
    status: { $in: ["called", "serving"] },
  });

  if (!ticket) {
    return { status: 404, body: { message: "Ticket is not eligible to skip." } };
  }

  ticket.status = "skipped";
  ticket.skippedAt = new Date();
  await ticket.save();

  session.lastSkippedTicketId = ticket._id;
  await session.save();

  await writeAudit({
    sessionId: session._id,
    ticketId: ticket._id,
    action: "mark_skipped",
    actorUserId: userId,
    metadata: { number: ticket.number },
  });

  const populated = await QueueSession.findById(session._id)
    .populate("roomId", "name roomCode roomNumber floor")
    .lean();

  const sessionPayload = await broadcastSessionUpdate(populated);

  return {
    status: 200,
    body: {
      ticket: serializeTicket(ticket),
      session: sessionPayload,
    },
  };
}

export async function pauseSession(userId, sessionId) {
  const doctor = await resolveDoctorForUser(userId);
  if (!doctor) {
    return { status: 404, body: { message: "Doctor profile not found." } };
  }

  const session = await QueueSession.findById(sessionId);
  if (!session) {
    return { status: 404, body: { message: "Queue session not found." } };
  }

  const ownershipError = await assertDoctorOwnsSession(session, doctor._id);
  if (ownershipError) return ownershipError;

  if (session.status !== "open") {
    return { status: 409, body: { message: "Only open sessions can be paused." } };
  }

  session.status = "paused";
  session.pausedAt = new Date();
  await session.save();

  await writeAudit({
    sessionId: session._id,
    action: "pause_session",
    actorUserId: userId,
  });

  const populated = await QueueSession.findById(session._id)
    .populate("roomId", "name roomCode roomNumber floor")
    .lean();

  const sessionPayload = await broadcastSessionUpdate(populated);

  return { status: 200, body: { session: sessionPayload } };
}

export async function resumeSession(userId, sessionId) {
  const doctor = await resolveDoctorForUser(userId);
  if (!doctor) {
    return { status: 404, body: { message: "Doctor profile not found." } };
  }

  const session = await QueueSession.findById(sessionId);
  if (!session) {
    return { status: 404, body: { message: "Queue session not found." } };
  }

  const ownershipError = await assertDoctorOwnsSession(session, doctor._id);
  if (ownershipError) return ownershipError;

  if (session.status !== "paused") {
    return { status: 409, body: { message: "Only paused sessions can be resumed." } };
  }

  session.status = "open";
  session.pausedAt = null;
  await session.save();

  await writeAudit({
    sessionId: session._id,
    action: "resume_session",
    actorUserId: userId,
  });

  const populated = await QueueSession.findById(session._id)
    .populate("roomId", "name roomCode roomNumber floor")
    .lean();

  const sessionPayload = await broadcastSessionUpdate(populated);

  return { status: 200, body: { session: sessionPayload } };
}

export async function closeSession(userId, sessionId) {
  const doctor = await resolveDoctorForUser(userId);
  if (!doctor) {
    return { status: 404, body: { message: "Doctor profile not found." } };
  }

  const session = await QueueSession.findById(sessionId);
  if (!session) {
    return { status: 404, body: { message: "Queue session not found." } };
  }

  const ownershipError = await assertDoctorOwnsSession(session, doctor._id);
  if (ownershipError) return ownershipError;

  if (session.status === "closed") {
    return { status: 409, body: { message: "Queue session is already closed." } };
  }

  session.status = "closed";
  session.closedAt = new Date();
  await session.save();

  await QueueTicket.updateMany(
    { sessionId: session._id, status: "waiting" },
    { status: "no-show" }
  );

  await writeAudit({
    sessionId: session._id,
    action: "close_session",
    actorUserId: userId,
  });

  const populated = await QueueSession.findById(session._id)
    .populate("roomId", "name roomCode roomNumber floor")
    .lean();

  const sessionPayload = await broadcastSessionUpdate(populated);

  return { status: 200, body: { session: sessionPayload } };
}

export async function getPatientQueueStatus(patientUserId) {
  const todayStart = startOfToday();
  const todayEnd = endOfToday();

  const ticket = await QueueTicket.findOne({
    patientUserId,
    status: { $in: ["waiting", "called", "serving"] },
    createdAt: { $gte: todayStart, $lt: todayEnd },
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!ticket) {
    return { status: 404, body: { message: "No active queue ticket today." } };
  }

  const session = await QueueSession.findById(ticket.sessionId)
    .populate("roomId", "name roomCode roomNumber floor")
    .lean();

  if (!session) {
    return { status: 404, body: { message: "Queue session not found." } };
  }

  const peopleAhead = await QueueTicket.countDocuments({
    sessionId: session._id,
    status: "waiting",
    number: { $lt: ticket.number },
  });

  return {
    status: 200,
    body: {
      ticket: serializeTicket(ticket),
      session: await serializeSession(session),
      peopleAhead,
      isCalled: ticket.status === "called" || ticket.status === "serving",
    },
  };
}

export async function getQueueBoard(roomId) {
  if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
    return { status: 400, body: { message: "Valid roomId is required." } };
  }

  const room = await ClinicRoom.findById(roomId).select("name roomCode roomNumber floor").lean();
  if (!room) {
    return { status: 404, body: { message: "Clinic room not found." } };
  }

  const today = startOfToday();
  const session = await QueueSession.findOne({ roomId, date: today })
    .sort({ createdAt: -1 })
    .lean();

  if (!session) {
    return {
      status: 200,
      body: {
        room: serializeRoom(room),
        session: null,
        currentNumber: 0,
        nextNumbers: [],
        state: "empty",
      },
    };
  }

  const waitingTickets = await QueueTicket.find({ sessionId: session._id, status: "waiting" })
    .sort({ number: 1 })
    .limit(5)
    .select("number")
    .lean();

  let state = "active";
  if (session.status === "closed") state = "closed";
  else if (session.status === "paused") state = "paused";
  else if (session.currentNumber === 0 && waitingTickets.length === 0) state = "empty";

  return {
    status: 200,
    body: {
      room: serializeRoom(room),
      session: {
        _id: session._id.toString(),
        status: session.status,
        currentNumber: session.currentNumber,
      },
      currentNumber: session.currentNumber,
      nextNumbers: waitingTickets.map((item) => item.number),
      state,
    },
  };
}

export { serializeTicket };
