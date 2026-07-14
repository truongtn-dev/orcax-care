/**
 * Ensure today's confirmed appointments exist for queue demo.
 * Run: cd server && node src/scripts/prepareQueueDemo.js
 */
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { User } from "../models/User.js";
import { Doctor } from "../models/Doctor.js";
import { Patient } from "../models/Patient.js";
import { ClinicRoom } from "../models/ClinicRoom.js";
import { AppointmentSlot } from "../models/AppointmentSlot.js";
import { Appointment } from "../models/Appointment.js";
import { QueueSession } from "../models/QueueSession.js";
import { QueueTicket } from "../models/QueueTicket.js";

const DEMO_PATIENTS = [
  {
    email: "patient@orcaxcare.com",
    fullName: "Demo Patient",
    phone: "0912345678",
    dateOfBirth: "1995-08-15T00:00:00.000Z",
    startTime: "10:00",
    endTime: "10:30",
  },
  {
    email: "queue.demo2@orcaxcare.com",
    fullName: "Tran Thi Binh",
    phone: "0912000002",
    dateOfBirth: "1990-03-20T00:00:00.000Z",
    startTime: "10:30",
    endTime: "11:00",
  },
  {
    email: "queue.demo3@orcaxcare.com",
    fullName: "Le Van Cuong",
    phone: "0912000003",
    dateOfBirth: "1985-11-08T00:00:00.000Z",
    startTime: "11:00",
    endTime: "11:30",
  },
  {
    email: "queue.demo4@orcaxcare.com",
    fullName: "Pham Thi Dung",
    phone: "0912000004",
    dateOfBirth: "1998-06-12T00:00:00.000Z",
    startTime: "11:30",
    endTime: "12:00",
  },
  {
    email: "queue.demo5@orcaxcare.com",
    fullName: "Hoang Van Em",
    phone: "0912000005",
    dateOfBirth: "1979-01-25T00:00:00.000Z",
    startTime: "14:00",
    endTime: "14:30",
  },
];

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatReferenceCode(appointmentId) {
  const value = appointmentId?.toString() || "";
  if (!value) return "";
  return `APT-${value.slice(-6).toUpperCase()}`;
}

async function ensureDemoPatient(entry, passwordHash) {
  let user = await User.findOne({ email: entry.email });
  if (!user) {
    user = await User.create({
      email: entry.email,
      passwordHash,
      role: "patient",
      fullName: entry.fullName,
      phone: entry.phone,
      isActive: true,
      isEmailVerified: true,
    });
  } else {
    user.fullName = entry.fullName;
    user.phone = entry.phone;
    await user.save();
  }

  await Patient.findOneAndUpdate(
    { userId: user._id },
    {
      userId: user._id,
      isActive: true,
      dateOfBirth: new Date(entry.dateOfBirth),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return user;
}

async function main() {
  await connectDatabase();

  const doctorUser = await User.findOne({ email: "doctor.an@orcaxcare.com" });
  const doctor = doctorUser ? await Doctor.findOne({ userId: doctorUser._id }) : null;
  const room = await ClinicRoom.findOne({ roomCode: "EMR101" });

  if (!doctor || !room) {
    throw new Error("Missing seed data. Run: npm run seed");
  }

  const today = startOfToday();
  await QueueTicket.deleteMany({ createdAt: { $gte: today } });
  await QueueSession.deleteMany({ date: today });

  try {
    const indexes = await Appointment.collection.indexes();
    for (const index of indexes) {
      const keys = Object.keys(index.key || {});
      if (keys.includes("appointmentDate") || keys.includes("patientId")) {
        if (index.name !== "_id_") {
          await Appointment.collection.dropIndex(index.name);
        }
      }
    }
  } catch {
    /* ignore index cleanup errors */
  }

  const passwordHash = await bcrypt.hash("Patient@123", 10);
  const appointments = [];

  for (const entry of DEMO_PATIENTS) {
    const patientUser = await ensureDemoPatient(entry, passwordHash);

    const slot = await AppointmentSlot.findOneAndUpdate(
      { doctorId: doctor._id, date: today, startTime: entry.startTime },
      {
        doctorId: doctor._id,
        workShiftId: new mongoose.Types.ObjectId(),
        roomId: room._id,
        date: today,
        startTime: entry.startTime,
        endTime: entry.endTime,
        status: "booked",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    let appointment = await Appointment.findOne({ slotId: slot._id });
    if (appointment) {
      appointment.patientUserId = patientUser._id;
      appointment.doctorId = doctor._id;
      appointment.reason = "Queue management demo visit";
      appointment.fee = doctor.consultationFee || 250000;
      appointment.status = "confirmed";
      await appointment.save();
    } else {
      appointment = await Appointment.create({
        patientUserId: patientUser._id,
        doctorId: doctor._id,
        slotId: slot._id,
        reason: "Queue management demo visit",
        fee: doctor.consultationFee || 250000,
        status: "confirmed",
      });
    }

    appointments.push({
      patientName: entry.fullName,
      email: entry.email,
      referenceCode: formatReferenceCode(appointment._id),
      appointmentId: appointment._id.toString(),
      startTime: entry.startTime,
    });
  }

  console.log("Queue demo ready:");
  console.log(`  Room ID: ${room._id}`);
  console.log(`  Confirmed appointments today: ${appointments.length}`);
  appointments.forEach((item, index) => {
    console.log(
      `    ${index + 1}. ${item.patientName} (${item.startTime}) — ${item.email} / ${item.referenceCode}`
    );
  });
  console.log("  Staff: check in each patient after doctor opens session.");
  console.log("  Accounts:");
  console.log("    Doctor:  doctor.an@orcaxcare.com / Doctor@123");
  console.log("    Staff:   staff@orcaxcare.com / Staff@123");
  console.log("    Patient: patient@orcaxcare.com / Patient@123 (demo patients use Patient@123)");

  await disconnectDatabase();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
