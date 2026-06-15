import mongoose from "mongoose";
import { Appointment } from "../models/Appointment.js";
import { AppointmentSlot } from "../models/AppointmentSlot.js";
import { formatDateOnly } from "../utils/shiftTime.js";

const ACTIVE_RESCHEDULE_STATUSES = new Set(["scheduled", "checked_in"]);

function serializeAppointment(appointment) {
  const patient = appointment.patientUserId;
  const doctor = appointment.doctorId;
  const slot = appointment.slotId;
  const room = slot?.roomId;

  return {
    _id: appointment._id.toString(),
    referenceCode: appointment.referenceCode,
    status: appointment.status,
    reason: appointment.reason || "",
    patientName: patient?.fullName || "",
    doctorId: doctor?._id?.toString() || doctor?.toString() || "",
    doctorName: doctor?.userId?.fullName || "",
    slot: slot
      ? {
          _id: slot._id.toString(),
          date: formatDateOnly(slot.date),
          startTime: slot.startTime,
          endTime: slot.endTime,
          status: slot.status,
          roomName: room?.name || "",
        }
      : null,
    createdAt: appointment.createdAt,
    updatedAt: appointment.updatedAt,
  };
}

function populateAppointment(query) {
  return query
    .populate("patientUserId", "fullName email")
    .populate({
      path: "doctorId",
      select: "userId licenseNo",
      populate: { path: "userId", select: "fullName" },
    })
    .populate({
      path: "slotId",
      select: "date startTime endTime status roomId doctorId",
      populate: { path: "roomId", select: "name roomNumber roomCode" },
    });
}

function isValidObjectId(value) {
  return Boolean(value && mongoose.Types.ObjectId.isValid(value));
}

export async function listAppointments(userId, query = {}) {
  const filter = { patientUserId: userId };
  const status = String(query.status || "").trim();
  if (status && status !== "all") {
    filter.status = status;
  }

  const appointments = await populateAppointment(
    Appointment.find(filter).sort({ createdAt: -1, _id: -1 })
  ).lean();

  return {
    status: 200,
    body: {
      items: appointments.map(serializeAppointment),
      total: appointments.length,
    },
  };
}

export async function getAppointment(userId, appointmentId) {
  if (!isValidObjectId(appointmentId)) {
    return { status: 400, body: { message: "Invalid appointment" } };
  }

  const appointment = await populateAppointment(
    Appointment.findOne({ _id: appointmentId, patientUserId: userId })
  ).lean();

  if (!appointment) {
    return { status: 404, body: { message: "Appointment not found" } };
  }

  return { status: 200, body: serializeAppointment(appointment) };
}

export async function rescheduleAppointment(userId, appointmentId, payload = {}) {
  if (!isValidObjectId(appointmentId)) {
    return { status: 400, body: { message: "Invalid appointment" } };
  }

  const slotId = String(payload.slotId || "").trim();
  if (!isValidObjectId(slotId)) {
    return { status: 400, body: { message: "Invalid appointment slot" } };
  }

  const appointment = await Appointment.findOne({
    _id: appointmentId,
    patientUserId: userId,
  });

  if (!appointment) {
    return { status: 404, body: { message: "Appointment not found" } };
  }

  if (!ACTIVE_RESCHEDULE_STATUSES.has(appointment.status)) {
    return { status: 409, body: { message: "Appointment cannot be rescheduled" } };
  }

  const oldSlotId = appointment.slotId;
  const newSlot = await AppointmentSlot.findOneAndUpdate(
    {
      _id: slotId,
      doctorId: appointment.doctorId,
      status: "available",
    },
    { status: "booked" },
    { new: true }
  );

  if (!newSlot) {
    return { status: 409, body: { message: "Selected appointment slot is not available" } };
  }

  try {
    appointment.slotId = newSlot._id;
    await appointment.save();
  } catch (err) {
    await AppointmentSlot.updateOne({ _id: newSlot._id }, { status: "available" });
    throw err;
  }

  await AppointmentSlot.updateOne({ _id: oldSlotId }, { status: "available" });

  const populated = await populateAppointment(Appointment.findById(appointment._id)).lean();
  return { status: 200, body: serializeAppointment(populated) };
}
