import mongoose from "mongoose";
import { Patient } from "../models/Patient.js";
import { Doctor } from "../models/Doctor.js";
import { AppointmentSlot } from "../models/AppointmentSlot.js";
import { Appointment } from "../models/Appointment.js";
import {
  deductWalletBalance,
  refundWalletBalance,
} from "../services/wallet.service.js";

function getSlotDateTime(slot) {
  const slotDate = new Date(slot.date);
  const [hours, minutes] = (slot.startTime || "00:00").split(":");
  slotDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
  return slotDate;
}

export async function getDoctorSlots(req, res) {
  try {
    const { doctorId } = req.params;
    if (!doctorId || !mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({ message: "Invalid doctor ID" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const slots = await AppointmentSlot.find({
      doctorId,
      status: "available",
      date: { $gte: today },
    })
      .sort({ date: 1, startTime: 1 })
      .lean();

    return res.json({ items: slots, total: slots.length });
  } catch (err) {
    console.error("Get doctor slots failed:", err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function listAppointments(req, res) {
  try {
    const patient = await Patient.findOne({ userId: req.user.userId }).lean();
    if (!patient) {
      return res.status(404).json({ message: "Patient profile not found" });
    }

    const appointments = await Appointment.find({ patientId: patient._id })
      .populate({
        path: "slotId",
        populate: { path: "roomId", select: "name" },
      })
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "fullName photoUrl email phone" },
      })
      .sort({ createdAt: -1 });

    return res.json({ items: appointments, total: appointments.length });
  } catch (err) {
    console.error("List appointments failed:", err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function bookAppointment(req, res) {
  try {
    const { slotId } = req.body;
    if (!slotId || !mongoose.Types.ObjectId.isValid(slotId)) {
      return res.status(400).json({ message: "Invalid slot ID" });
    }

    const slot = await AppointmentSlot.findById(slotId);
    if (!slot) {
      return res.status(404).json({ message: "Appointment slot not found" });
    }

    if (slot.status !== "available") {
      return res
        .status(400)
        .json({ message: "Appointment slot is no longer available" });
    }

    const patient = await Patient.findOne({ userId: req.user.userId });
    if (!patient) {
      return res.status(404).json({ message: "Patient profile not found" });
    }

    const price = 150000; // Flat rate 150,000 VND

    // Deduct wallet balance
    const walletRes = await deductWalletBalance(
      req.user.userId,
      price,
      "Appointment booking fee",
    );
    if (walletRes.status !== 200) {
      return res.status(walletRes.status).json(walletRes.body);
    }

    // Update slot status
    slot.status = "booked";
    await slot.save();

    // Create appointment
    const appointment = await Appointment.create({
      patientId: patient._id,
      doctorId: slot.doctorId,
      slotId: slot._id,
      price,
      status: "booked",
    });

    const populated = await Appointment.findById(appointment._id)
      .populate({
        path: "slotId",
        populate: { path: "roomId", select: "name" },
      })
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "fullName photoUrl email phone" },
      });

    return res.status(201).json(populated);
  } catch (err) {
    console.error("Book appointment failed:", err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function cancelAppointment(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid appointment ID" });
    }

    const appointment = await Appointment.findById(id).populate("slotId");
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    const patient = await Patient.findOne({ userId: req.user.userId });
    if (!patient || String(appointment.patientId) !== String(patient._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (appointment.status !== "booked") {
      return res
        .status(400)
        .json({ message: "Only active booked appointments can be cancelled" });
    }

    const slot = appointment.slotId;
    if (!slot) {
      return res
        .status(404)
        .json({ message: "Appointment slot data is missing" });
    }

    const slotDateTime = getSlotDateTime(slot);
    const now = new Date();

    if (now >= slotDateTime) {
      return res.status(400).json({
        message:
          "Cannot cancel an appointment that has already started or passed",
      });
    }

    const diffMs = slotDateTime.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    let refundAmount = 0;
    if (diffHours >= 24) {
      refundAmount = appointment.price; // 100% refund
    } else if (diffHours >= 12) {
      refundAmount = Math.floor(appointment.price * 0.5); // 50% refund
    } else {
      refundAmount = 0; // 0% refund
    }

    // Trigger refund if amount > 0
    if (refundAmount > 0) {
      const refundRes = await refundWalletBalance(
        req.user.userId,
        refundAmount,
        `Refund for cancelled appointment ${appointment._id}`,
      );
      if (refundRes.status !== 200) {
        return res.status(refundRes.status).json(refundRes.body);
      }
    }

    // Update slot and appointment status
    slot.status = "available";
    await slot.save();

    appointment.status = "cancelled";
    appointment.cancellationReason = reason || "Cancelled by patient";
    appointment.refundAmount = refundAmount;
    await appointment.save();

    const populated = await Appointment.findById(appointment._id)
      .populate({
        path: "slotId",
        populate: { path: "roomId", select: "name" },
      })
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "fullName photoUrl email phone" },
      });

    return res.json(populated);
  } catch (err) {
    console.error("Cancel appointment failed:", err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function rateAppointment(req, res) {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid appointment ID" });
    }

    const valRating = parseInt(rating, 10);
    if (isNaN(valRating) || valRating < 1 || valRating > 5) {
      return res
        .status(400)
        .json({ message: "Rating must be an integer between 1 and 5" });
    }

    const appointment = await Appointment.findById(id).populate("slotId");
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    const patient = await Patient.findOne({ userId: req.user.userId });
    if (!patient || String(appointment.patientId) !== String(patient._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (appointment.rating !== null) {
      return res
        .status(400)
        .json({ message: "This appointment has already been rated" });
    }

    const slot = appointment.slotId;
    if (!slot) {
      return res
        .status(404)
        .json({ message: "Appointment slot data is missing" });
    }

    const slotDateTime = getSlotDateTime(slot);
    const now = new Date();

    if (now < slotDateTime) {
      return res.status(400).json({ message: "Cannot rate an appointment before its scheduled start time" });
    }

    // Set rating info and change status to completed
    appointment.rating = valRating;
    appointment.reviewComment = comment || "";
    appointment.reviewedAt = new Date();
    appointment.status = "completed";
    await appointment.save();

    // Recalculate doctor ratings average & count
    const ratings = await Appointment.find({
      doctorId: appointment.doctorId,
      rating: { $ne: null },
    })
      .select("rating")
      .lean();

    const ratingCount = ratings.length;
    const ratingAverage =
      ratingCount > 0
        ? parseFloat(
            (
              ratings.reduce((sum, r) => sum + r.rating, 0) / ratingCount
            ).toFixed(1),
          )
        : 0;

    await Doctor.findByIdAndUpdate(appointment.doctorId, {
      ratingAverage,
      ratingCount,
    });

    const populated = await Appointment.findById(appointment._id)
      .populate({
        path: "slotId",
        populate: { path: "roomId", select: "name" },
      })
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "fullName photoUrl email phone" },
      });

    return res.json(populated);
  } catch (err) {
    console.error("Rate appointment failed:", err);
    return res.status(500).json({ message: "System error" });
  }
}
