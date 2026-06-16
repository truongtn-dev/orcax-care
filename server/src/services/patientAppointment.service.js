import mongoose from "mongoose";
import { Appointment } from "../models/Appointment.js";
import { AppointmentSlot } from "../models/AppointmentSlot.js";
import { Doctor } from "../models/Doctor.js";
import { InsuranceCard } from "../models/InsuranceCard.js";
import { User } from "../models/User.js";
import { DEFAULT_CONSULTATION_FEE_VND } from "../config/booking.js";
import { getConsultationFee } from "./doctorAvailability.service.js";
import { deductWalletBalance, getOrCreateWallet } from "./wallet.service.js";
import { WalletTransaction } from "../models/WalletTransaction.js";
import { formatDateOnly, isSlotDatetimePast } from "../utils/shiftTime.js";

function serializeAppointment(doc) {
  const doctor = doc.doctorId;
  const doctorUser = doctor?.userId;
  const specialty = doctor?.specialtyId;
  const slot = doc.slotId;
  const room = slot?.roomId;

  return {
    _id: doc._id.toString(),
    status: doc.status,
    reason: doc.reason || "",
    fee: doc.fee,
    currency: "VND",
    rating: doc.rating ?? null,
    reviewComment: doc.reviewComment || "",
    reviewedAt: doc.reviewedAt || null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    doctor: {
      _id: doctor?._id?.toString() || "",
      fullName: doctorUser?.fullName || "",
      specialty: specialty?.name || "",
    },
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
  };
}

async function validateInsuranceCard(userId, insuranceCardId) {
  if (!insuranceCardId) return null;
  if (!mongoose.Types.ObjectId.isValid(insuranceCardId)) {
    return { status: 400, body: { message: "Invalid insurance card" } };
  }

  const card = await InsuranceCard.findOne({
    _id: insuranceCardId,
    userId,
    isActive: true,
  }).lean();

  if (!card) {
    return { status: 404, body: { message: "Insurance card not found" } };
  }

  return card;
}

export async function createAppointment(userId, payload = {}) {
  const { slotId, reason = "", insuranceCardId = null } = payload;

  if (!slotId || !mongoose.Types.ObjectId.isValid(slotId)) {
    return { status: 400, body: { message: "Valid slotId is required" } };
  }

  const patient = await User.findOne({ _id: userId, role: "patient", isActive: true }).lean();
  if (!patient) {
    return { status: 403, body: { message: "Patient account required" } };
  }

  const insuranceResult = await validateInsuranceCard(userId, insuranceCardId || null);
  if (insuranceResult?.status) return insuranceResult;

  const slot = await AppointmentSlot.findById(slotId).lean();
  if (!slot) {
    return { status: 404, body: { message: "Appointment slot not found" } };
  }

  if (slot.status !== "available") {
    return { status: 409, body: { message: "This slot is no longer available" } };
  }

  if (isSlotDatetimePast(slot.date, slot.startTime)) {
    return { status: 409, body: { message: "Cannot book a past appointment slot" } };
  }

  const doctor = await Doctor.findOne({ _id: slot.doctorId, isActive: true })
    .populate("userId", "fullName isActive")
    .populate("specialtyId", "name")
    .lean();

  if (!doctor || !doctor.userId?.isActive) {
    return { status: 404, body: { message: "Doctor not found" } };
  }

  const fee = getConsultationFee();
  const trimmedReason = String(reason || "").trim().slice(0, 500);

  const claimed = await AppointmentSlot.findOneAndUpdate(
    { _id: slotId, status: "available" },
    { status: "booked" },
    { new: true }
  );

  if (!claimed) {
    return { status: 409, body: { message: "This slot was just taken by another patient" } };
  }

  const payment = await deductWalletBalance(
    userId,
    fee,
    `Appointment with ${doctor.userId.fullName} on ${formatDateOnly(claimed.date)} ${claimed.startTime}`
  );

  if (payment.status !== 200) {
    await AppointmentSlot.findByIdAndUpdate(slotId, { status: "available" });
    return payment;
  }

  try {
    const appointment = await Appointment.create({
      patientUserId: userId,
      doctorId: doctor._id,
      slotId: claimed._id,
      reason: trimmedReason,
      fee,
      status: "confirmed",
      insuranceCardId: insuranceResult?._id || null,
    });

    const populated = await Appointment.findById(appointment._id)
      .populate({
        path: "doctorId",
        populate: [
          { path: "userId", select: "fullName" },
          { path: "specialtyId", select: "name" },
        ],
      })
      .populate({
        path: "slotId",
        populate: { path: "roomId", select: "name" },
      })
      .lean();

    return {
      status: 201,
      body: {
        appointment: serializeAppointment(populated),
        wallet: payment.body,
      },
    };
  } catch (err) {
    await AppointmentSlot.findByIdAndUpdate(slotId, { status: "available" });
    const wallet = await getOrCreateWallet(userId);
    wallet.balance += fee;
    await wallet.save();
    await WalletTransaction.create({
      userId,
      type: "topup",
      amount: fee,
      status: "success",
      provider: "internal",
      description: "Refund — appointment booking failed",
      balanceAfter: wallet.balance,
    });
    throw err;
  }
}

export async function listAppointments(userId, query = {}) {
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 20));
  const status = query.status === "cancelled" ? "cancelled" : query.status === "confirmed" ? "confirmed" : null;

  const filter = { patientUserId: userId };
  if (status) filter.status = status;

  const rows = await Appointment.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate({
      path: "doctorId",
      populate: [
        { path: "userId", select: "fullName" },
        { path: "specialtyId", select: "name" },
      ],
    })
    .populate({
      path: "slotId",
      populate: { path: "roomId", select: "name" },
    })
    .lean();

  return {
    status: 200,
    body: {
      items: rows.map(serializeAppointment),
    },
  };
}

export async function getAppointment(userId, appointmentId) {
  if (!appointmentId || !mongoose.Types.ObjectId.isValid(appointmentId)) {
    return { status: 400, body: { message: "Invalid appointment" } };
  }

  const doc = await Appointment.findOne({ _id: appointmentId, patientUserId: userId })
    .populate({
      path: "doctorId",
      populate: [
        { path: "userId", select: "fullName" },
        { path: "specialtyId", select: "name" },
      ],
    })
    .populate({
      path: "slotId",
      populate: { path: "roomId", select: "name" },
    })
    .lean();

  if (!doc) {
    return { status: 404, body: { message: "Appointment not found" } };
  }

  return { status: 200, body: serializeAppointment(doc) };
}

const ACTIVE_RESCHEDULE_STATUSES = new Set(["confirmed"]);

export async function rescheduleAppointment(userId, appointmentId, payload = {}) {
  if (!appointmentId || !mongoose.Types.ObjectId.isValid(appointmentId)) {
    return { status: 400, body: { message: "Invalid appointment" } };
  }

  const slotId = String(payload.slotId || "").trim();
  if (!slotId || !mongoose.Types.ObjectId.isValid(slotId)) {
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

  if (isSlotDatetimePast(newSlot.date, newSlot.startTime)) {
    await AppointmentSlot.updateOne({ _id: newSlot._id }, { status: "available" });
    return { status: 409, body: { message: "Cannot reschedule to a past appointment slot" } };
  }

  try {
    appointment.slotId = newSlot._id;
    await appointment.save();
  } catch (err) {
    await AppointmentSlot.updateOne({ _id: newSlot._id }, { status: "available" });
    throw err;
  }

  await AppointmentSlot.updateOne({ _id: oldSlotId }, { status: "available" });

  const populated = await Appointment.findById(appointment._id)
    .populate({
      path: "doctorId",
      populate: [
        { path: "userId", select: "fullName" },
        { path: "specialtyId", select: "name" },
      ],
    })
    .populate({
      path: "slotId",
      populate: { path: "roomId", select: "name" },
    })
    .lean();

  return { status: 200, body: serializeAppointment(populated) };
}

export async function rateAppointment(userId, appointmentId, payload = {}) {
  if (!appointmentId || !mongoose.Types.ObjectId.isValid(appointmentId)) {
    return { status: 400, body: { message: "Invalid appointment" } };
  }

  const rating = parseInt(payload.rating, 10);
  if (Number.isNaN(rating) || rating < 1 || rating > 5) {
    return { status: 400, body: { message: "Rating must be an integer between 1 and 5" } };
  }

  const appointment = await Appointment.findOne({
    _id: appointmentId,
    patientUserId: userId,
  }).populate({
    path: "slotId",
    select: "date startTime",
  });

  if (!appointment) {
    return { status: 404, body: { message: "Appointment not found" } };
  }

  if (appointment.rating != null) {
    return { status: 400, body: { message: "This appointment has already been rated" } };
  }

  if (appointment.status === "cancelled") {
    return { status: 409, body: { message: "Cancelled appointments cannot be rated" } };
  }

  const slot = appointment.slotId;
  if (!slot) {
    return { status: 404, body: { message: "Appointment slot data is missing" } };
  }

  if (!isSlotDatetimePast(slot.date, slot.startTime)) {
    return {
      status: 400,
      body: { message: "Cannot rate an appointment before its scheduled start time" },
    };
  }

  appointment.rating = rating;
  appointment.reviewComment = String(payload.comment || "").trim().slice(0, 1000);
  appointment.reviewedAt = new Date();
  appointment.status = "completed";
  await appointment.save();

  const ratings = await Appointment.find({
    doctorId: appointment.doctorId,
    rating: { $ne: null },
  })
    .select("rating")
    .lean();

  const ratingCount = ratings.length;
  const ratingAverage =
    ratingCount > 0
      ? parseFloat((ratings.reduce((sum, row) => sum + row.rating, 0) / ratingCount).toFixed(1))
      : 0;

  await Doctor.findByIdAndUpdate(appointment.doctorId, {
    ratingAverage,
    ratingCount,
  });

  const populated = await Appointment.findById(appointment._id)
    .populate({
      path: "doctorId",
      populate: [
        { path: "userId", select: "fullName" },
        { path: "specialtyId", select: "name" },
      ],
    })
    .populate({
      path: "slotId",
      populate: { path: "roomId", select: "name" },
    })
    .lean();

  return { status: 200, body: serializeAppointment(populated) };
}

export { DEFAULT_CONSULTATION_FEE_VND };
