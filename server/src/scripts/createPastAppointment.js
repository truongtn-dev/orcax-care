import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { DEFAULT_CONSULTATION_FEE_VND } from "../config/booking.js";
import { Appointment } from "../models/Appointment.js";
import { AppointmentSlot } from "../models/AppointmentSlot.js";
import { Doctor } from "../models/Doctor.js";
import { User } from "../models/User.js";
import { WorkShift } from "../models/WorkShift.js";
import { formatDateOnly } from "../utils/shiftTime.js";

async function run() {
  const ok = await connectDatabase();
  if (!ok || mongoose.connection.readyState !== 1) {
    console.error("Failed to connect to MongoDB.");
    process.exit(1);
  }

  const patientEmail = process.argv[2] || "patient@orcaxcare.com";
  const patientUser = await User.findOne({ email: patientEmail, role: "patient", isActive: true });
  if (!patientUser) {
    console.error(`Patient user not found: ${patientEmail}`);
    process.exit(1);
  }

  const workShift = await WorkShift.findOne({ isActive: true });
  if (!workShift) {
    console.error("No active work shift found.");
    process.exit(1);
  }

  const doctor = await Doctor.findById(workShift.doctorId).populate("userId", "fullName");
  if (!doctor) {
    console.error("Doctor for work shift not found.");
    process.exit(1);
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const existing = await Appointment.findOne({
    patientUserId: patientUser._id,
    doctorId: doctor._id,
    status: "confirmed",
    rating: null,
  }).populate("slotId", "date startTime");

  if (existing?.slotId && formatDateOnly(existing.slotId.date) === formatDateOnly(yesterday)) {
    console.log("Past unrated appointment already exists:");
    console.log(`  appointmentId: ${existing._id}`);
    console.log(`  doctor: ${doctor.userId?.fullName || doctor._id}`);
    console.log(`  slot: ${formatDateOnly(existing.slotId.date)} ${existing.slotId.startTime}`);
    await disconnectDatabase();
    return;
  }

  const oldSlot = await AppointmentSlot.findOne({
    doctorId: doctor._id,
    date: yesterday,
    startTime: "09:00",
  });
  if (oldSlot) {
    await Appointment.deleteMany({ slotId: oldSlot._id });
    await AppointmentSlot.deleteOne({ _id: oldSlot._id });
  }

  const slot = await AppointmentSlot.create({
    doctorId: doctor._id,
    workShiftId: workShift._id,
    date: yesterday,
    startTime: "09:00",
    endTime: "09:30",
    status: "booked",
  });

  const appointment = await Appointment.create({
    patientUserId: patientUser._id,
    doctorId: doctor._id,
    slotId: slot._id,
    status: "confirmed",
    reason: "Demo visit for rating",
    fee: DEFAULT_CONSULTATION_FEE_VND,
  });

  console.log("Created past appointment ready for rating:");
  console.log(`  patient: ${patientUser.fullName} (${patientUser.email})`);
  console.log(`  doctor: ${doctor.userId?.fullName || doctor._id}`);
  console.log(`  appointmentId: ${appointment._id}`);
  console.log(`  slot: ${formatDateOnly(slot.date)} ${slot.startTime}-${slot.endTime}`);
  console.log("Open /patient/appointments and use Rate doctor.");

  await disconnectDatabase();
}

run().catch(async (err) => {
  console.error(err);
  await disconnectDatabase().catch(() => {});
  process.exit(1);
});
