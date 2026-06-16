import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../config/database.js";
import { User } from "../models/User.js";
import { Patient } from "../models/Patient.js";
import { Doctor } from "../models/Doctor.js";
import { AppointmentSlot } from "../models/AppointmentSlot.js";
import { Appointment } from "../models/Appointment.js";
import { WorkShift } from "../models/WorkShift.js";

async function run() {
  const ok = await connectDatabase();
  if (!ok || mongoose.connection.readyState !== 1) {
    console.error("Failed to connect to MongoDB.");
    process.exit(1);
  }

  // 1. Find the User with name "benh nhan"
  const user = await User.findOne({ fullName: /benh\s*nhan/i });
  if (!user) {
    console.error("User 'benh nhan' not found in database.");
    process.exit(1);
  }

  // Find the corresponding Patient record
  const patient = await Patient.findOne({ userId: user._id }).populate("userId");
  if (!patient) {
    console.error(`No Patient record found for user: ${user.fullName}`);
    process.exit(1);
  }
  console.log(`Using Patient: ${patient.userId?.fullName} (${patient._id})`);

  // 2. Find the first Doctor
  const doctor = await Doctor.findOne().populate("userId");
  if (!doctor) {
    console.error("No doctor found in database.");
    process.exit(1);
  }
  console.log(`Using Doctor: ${doctor.userId?.fullName || "Doctor"} (${doctor._id})`);

  // 3. Find any WorkShift
  const workShift = await WorkShift.findOne();
  if (!workShift) {
    console.error("No work shift found in database.");
    process.exit(1);
  }

  // 4. Create a slot in the past (yesterday)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  // Clean up any old duplicate test slot & appointment first to remain idempotent
  const oldSlot = await AppointmentSlot.findOne({
    doctorId: doctor._id,
    date: yesterday,
    startTime: "09:00"
  });
  if (oldSlot) {
    console.log(`Cleaning up old test slot & appointment from previous run...`);
    await Appointment.deleteOne({ slotId: oldSlot._id });
    await AppointmentSlot.deleteOne({ _id: oldSlot._id });
  }

  const slot = new AppointmentSlot({
    doctorId: doctor._id,
    workShiftId: workShift._id,
    date: yesterday,
    startTime: "09:00",
    endTime: "09:30",
    status: "booked"
  });
  await slot.save();
  console.log(`Created past Slot: ${slot._id} on date ${slot.date.toDateString()}`);

  // 5. Create the Appointment
  const appointment = new Appointment({
    patientId: patient._id,
    doctorId: doctor._id,
    slotId: slot._id,
    price: 150000,
    status: "booked",
    rating: null,
    reviewComment: ""
  });
  await appointment.save();
  console.log(`Created past Appointment: ${appointment._id}`);

  console.log("\nSuccess! Please reload your web page and go to 'History' tab to test rating.");
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
