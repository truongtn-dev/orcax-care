import mongoose from "mongoose";
import { Appointment } from "../models/Appointment.js";
import { AppointmentSlot } from "../models/AppointmentSlot.js";
import { Doctor } from "../models/Doctor.js";
import { InsuranceCard } from "../models/InsuranceCard.js";
import { User } from "../models/User.js";
import { DEFAULT_CONSULTATION_FEE_VND } from "../config/booking.js";
import { resolveConsultationFee } from "../utils/consultationFee.js";
import { deductWalletBalance, getOrCreateWallet, refundWalletBalance } from "./wallet.service.js";
import { WalletTransaction } from "../models/WalletTransaction.js";
import { formatDateOnly, isSlotDatetimePast } from "../utils/shiftTime.js";
import {
  calculateInsuranceFee,
  describeInsuranceIneligibility,
  isInsuranceCardEligibleOnDate,
} from "../utils/insuranceFee.js";
import {
  buildAppointmentVisitLabel,
  formatWalletAmount,
  notifyPatientSafe,
} from "./notification.service.js";

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
    discountAmount: doc.discountAmount ?? 0,
    baseFee: (doc.fee || 0) + (doc.discountAmount || 0),
    currency: "VND",
    rating: doc.rating ?? null,
    reviewComment: doc.reviewComment || "",
    reviewedAt: doc.reviewedAt || null,
    cancellationReason: doc.cancellationReason || "",
    refundAmount: doc.refundAmount ?? 0,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    doctor: {
      _id: doctor?._id?.toString() || "",
      slug: doctor?.slug || "",
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

async function validateInsuranceCard(userId, insuranceCardId, visitDate) {
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

  if (!isInsuranceCardEligibleOnDate(card, visitDate)) {
    const reason = describeInsuranceIneligibility(card, visitDate);
    return {
      status: 400,
      body: {
        message: reason || "Insurance card cannot be used for this appointment date.",
      },
    };
  }

  return card;
}

export async function previewBookingFee(userId, payload = {}) {
  const { slotId, insuranceCardId = null } = payload;

  if (!slotId || !mongoose.Types.ObjectId.isValid(slotId)) {
    return { status: 400, body: { message: "Valid slotId is required" } };
  }

  const slot = await AppointmentSlot.findById(slotId).lean();
  if (!slot) {
    return { status: 404, body: { message: "Appointment slot not found" } };
  }

  const doctor = await Doctor.findOne({ _id: slot.doctorId, isActive: true }).select("consultationFee").lean();
  if (!doctor) {
    return { status: 404, body: { message: "Doctor not found" } };
  }

  const baseFee = resolveConsultationFee(doctor);
  let card = null;
  if (insuranceCardId) {
    const insuranceResult = await validateInsuranceCard(userId, insuranceCardId, slot.date);
    if (insuranceResult?.status) return insuranceResult;
    card = insuranceResult;
  }

  const feeSummary = calculateInsuranceFee(baseFee, card, slot.date);

  return {
    status: 200,
    body: {
      slotId: slot._id.toString(),
      visitDate: formatDateOnly(slot.date),
      ...feeSummary,
      insuranceCardId: card?._id?.toString() || null,
    },
  };
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

  const insuranceResult = await validateInsuranceCard(userId, insuranceCardId || null, slot.date);
  if (insuranceResult?.status) return insuranceResult;

  const doctor = await Doctor.findOne({ _id: slot.doctorId, isActive: true })
    .populate("userId", "fullName isActive")
    .populate("specialtyId", "name")
    .lean();

  if (!doctor || !doctor.userId?.isActive) {
    return { status: 404, body: { message: "Doctor not found" } };
  }

  const baseFee = resolveConsultationFee(doctor);
  const insuranceCard = insuranceResult || null;
  const feeSummary = calculateInsuranceFee(baseFee, insuranceCard, slot.date);
  const { finalFee, discountAmount } = feeSummary;
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
    finalFee,
    `Appointment with ${doctor.userId.fullName} on ${formatDateOnly(claimed.date)} ${claimed.startTime}${
      discountAmount > 0 ? ` (insurance coverage ${feeSummary.coveragePercent}%)` : ""
    }`
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
      fee: finalFee,
      discountAmount,
      status: "confirmed",
      insuranceCardId: insuranceCard?._id || null,
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

    notifyPatientSafe(userId, {
      title: "Appointment confirmed",
      message: `Your visit with ${doctor.userId.fullName} is booked for ${buildAppointmentVisitLabel(populated.slotId)}.`,
      type: "appointment",
      link: "/patient/appointments",
    });

    return {
      status: 201,
      body: {
        appointment: serializeAppointment(populated),
        feeSummary,
        wallet: payment.body,
      },
    };
  } catch (err) {
    await AppointmentSlot.findByIdAndUpdate(slotId, { status: "available" });
    const wallet = await getOrCreateWallet(userId);
    wallet.balance += finalFee;
    await wallet.save();
    await WalletTransaction.create({
      userId,
      type: "topup",
      amount: finalFee,
      status: "success",
      provider: "internal",
      description: "Refund — appointment booking failed",
      balanceAfter: wallet.balance,
    });
    throw err;
  }
}

const APPOINTMENT_LIST_CAP = 500;
const APPOINTMENT_TABS = new Set(["all", "upcoming", "past", "reviews", "cancelled"]);

function isSlotVisitPast(slot) {
  if (!slot?.date) return false;
  const visitEnd = slot.endTime || slot.startTime;
  if (!visitEnd) return false;
  return isSlotDatetimePast(slot.date, visitEnd);
}

function canRateDoc(doc) {
  return doc.rating == null && doc.status !== "cancelled" && isSlotVisitPast(doc.slotId);
}

function matchesAppointmentTab(doc, tab) {
  if (tab === "all") return true;
  if (tab === "cancelled") return doc.status === "cancelled";
  if (tab === "reviews") return canRateDoc(doc);
  if (tab === "upcoming") return doc.status !== "cancelled" && !isSlotVisitPast(doc.slotId);
  if (tab === "past") return doc.status !== "cancelled" && isSlotVisitPast(doc.slotId);
  return true;
}

function slotSortKeyDoc(doc) {
  const slot = doc.slotId;
  if (!slot?.date) return 0;
  const time = slot.startTime || "00:00";
  return new Date(`${formatDateOnly(slot.date)}T${time}:00`).getTime();
}

function sortAppointmentDocs(docs) {
  return [...docs].sort((a, b) => {
    const aPast = isSlotVisitPast(a.slotId);
    const bPast = isSlotVisitPast(b.slotId);
    if (aPast !== bPast) return aPast ? 1 : -1;
    const diff = slotSortKeyDoc(a) - slotSortKeyDoc(b);
    return aPast ? -diff : diff;
  });
}

function computeAppointmentTabCounts(docs) {
  let upcoming = 0;
  let past = 0;
  let cancelled = 0;
  let pendingReviews = 0;

  for (const doc of docs) {
    if (doc.status === "cancelled") {
      cancelled += 1;
      continue;
    }
    if (isSlotVisitPast(doc.slotId)) {
      past += 1;
      if (canRateDoc(doc)) pendingReviews += 1;
    } else {
      upcoming += 1;
    }
  }

  return {
    all: docs.length,
    upcoming,
    past,
    reviews: pendingReviews,
    cancelled,
  };
}

export async function listAppointments(userId, query = {}) {
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 10));
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const tab = APPOINTMENT_TABS.has(String(query.tab || "").toLowerCase())
    ? String(query.tab).toLowerCase()
    : "all";

  const rows = await Appointment.find({ patientUserId: userId })
    .sort({ createdAt: -1 })
    .limit(APPOINTMENT_LIST_CAP)
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

  const sorted = sortAppointmentDocs(rows);
  const tabCounts = computeAppointmentTabCounts(sorted);
  const filtered =
    tab === "all" ? sorted : sorted.filter((doc) => matchesAppointmentTab(doc, tab));
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * limit, safePage * limit);

  return {
    status: 200,
    body: {
      items: paged.map(serializeAppointment),
      total,
      page: safePage,
      limit,
      totalPages,
      tabCounts,
      stats: {
        upcoming: tabCounts.upcoming,
        past: tabCounts.past,
        pendingReviews: tabCounts.reviews,
        cancelled: tabCounts.cancelled,
      },
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

  notifyPatientSafe(userId, {
    title: "Appointment rescheduled",
    message: `Your visit is now scheduled for ${buildAppointmentVisitLabel(populated.slotId)}.`,
    type: "appointment",
    link: "/patient/appointments",
  });

  return { status: 200, body: serializeAppointment(populated) };
}

function getRefundAmount(fee, slotDate, startTime) {
  const slotDateTime = new Date(`${formatDateOnly(slotDate)}T${startTime || "00:00"}:00`);
  const diffHours = (slotDateTime.getTime() - Date.now()) / (1000 * 60 * 60);

  if (diffHours >= 24) return fee;
  if (diffHours >= 12) return Math.floor(fee * 0.5);
  return 0;
}

export async function cancelAppointment(userId, appointmentId, payload = {}) {
  if (!appointmentId || !mongoose.Types.ObjectId.isValid(appointmentId)) {
    return { status: 400, body: { message: "Invalid appointment" } };
  }

  const appointment = await Appointment.findOne({
    _id: appointmentId,
    patientUserId: userId,
  }).populate({ path: "slotId", select: "date startTime status" });

  if (!appointment) {
    return { status: 404, body: { message: "Appointment not found" } };
  }

  if (appointment.status !== "confirmed") {
    return { status: 409, body: { message: "Only confirmed appointments can be cancelled" } };
  }

  const slot = appointment.slotId;
  if (!slot) {
    return { status: 404, body: { message: "Appointment slot data is missing" } };
  }

  if (isSlotDatetimePast(slot.date, slot.startTime)) {
    return {
      status: 400,
      body: { message: "Cannot cancel an appointment that has already started or passed" },
    };
  }

  const refundAmount = getRefundAmount(appointment.fee, slot.date, slot.startTime);

  if (refundAmount > 0) {
    const refund = await refundWalletBalance(
      userId,
      refundAmount,
      `Refund for cancelled appointment ${appointment._id}`
    );
    if (refund.status !== 200) {
      return refund;
    }
  }

  await AppointmentSlot.updateOne({ _id: slot._id }, { status: "available" });

  appointment.status = "cancelled";
  appointment.cancellationReason = String(payload.reason || "Cancelled by patient").trim().slice(0, 500);
  appointment.refundAmount = refundAmount;
  await appointment.save();

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

  const refundNote =
    refundAmount > 0
      ? ` A refund of ${formatWalletAmount(refundAmount)} was returned to your wallet.`
      : "";

  notifyPatientSafe(userId, {
    title: "Appointment cancelled",
    message: `Your appointment was cancelled.${refundNote}`.trim(),
    type: "appointment",
    link: "/patient/appointments",
  });

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

  const visitEndTime = slot.endTime || slot.startTime;
  if (!isSlotDatetimePast(slot.date, visitEndTime)) {
    return {
      status: 400,
      body: { message: "Cannot rate an appointment before the visit has ended" },
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
