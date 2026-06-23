import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { User } from "../models/User.js";
import { Specialty } from "../models/Specialty.js";
import { Department } from "../models/Department.js";
import { Doctor } from "../models/Doctor.js";
import { Patient } from "../models/Patient.js";
import { ensureAllDoctorSlugs } from "../utils/doctorSlug.js";
import { Medicine } from "../models/Medicine.js";
import { ClinicRoom } from "../models/ClinicRoom.js";
import { AppointmentSlot } from "../models/AppointmentSlot.js";
import { Appointment } from "../models/Appointment.js";
import { Encounter } from "../models/Encounter.js";
import { MedicalImage } from "../models/MedicalImage.js";
import { Prescription } from "../models/Prescription.js";
import { StockMovement } from "../models/StockMovement.js";

const specialties = [
  { code: "CARD", name: "Cardiology", description: "Heart and cardiovascular system" },
  { code: "DERM", name: "Dermatology", description: "Skin conditions" },
  { code: "PED", name: "Pediatrics", description: "Children's health" },
  { code: "NEUR", name: "Neurology", description: "Brain and nervous system" },
  { code: "ORTH", name: "Orthopedics", description: "Bones and joints" },
];

const departments = [
  { name: "Internal Medicine", location: "Building A - Floor 2", phone: "028-1234-1001" },
  { name: "Surgery", location: "Building B - Floor 3", phone: "028-1234-1002" },
  { name: "Pediatrics Ward", location: "Building C - Floor 1", phone: "028-1234-1003" },
];

const doctors = [
  { fullName: "Dr. Nguyen Van An", email: "doctor.an@orcaxcare.com", specialty: "CARD", department: "Internal Medicine", licenseNo: "LIC-001", bio: "15 years experience in cardiology.", consultationFee: 250000 },
  { fullName: "Dr. Tran Thi Binh", email: "doctor.binh@orcaxcare.com", specialty: "DERM", department: "Internal Medicine", licenseNo: "LIC-002", bio: "Specialist in dermatology and skin care.", consultationFee: 180000 },
  { fullName: "Dr. Le Minh Cuong", email: "doctor.cuong@orcaxcare.com", specialty: "PED", department: "Pediatrics Ward", licenseNo: "LIC-003", bio: "Pediatrician with focus on preventive care.", consultationFee: 220000 },
  { fullName: "Dr. Pham Hoai Duc", email: "doctor.duc@orcaxcare.com", specialty: "NEUR", department: "Surgery", licenseNo: "LIC-004", bio: "Neurology and neurosurgery consultant.", consultationFee: 300000 },
  { fullName: "Dr. Vo Thi Em", email: "doctor.em@orcaxcare.com", specialty: "ORTH", department: "Surgery", licenseNo: "LIC-005", bio: "Orthopedic surgeon — sports injuries.", consultationFee: 280000 },
  { fullName: "Dr. Hoang Quoc Giang", email: "doctor.giang@orcaxcare.com", specialty: "CARD", department: "Internal Medicine", licenseNo: "LIC-006", bio: "Interventional cardiology.", consultationFee: 260000 },
];

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

async function upsertEncounterDemoData({ patientUser, doctor, departmentId, signedOffBy }) {
  const room = await ClinicRoom.findOneAndUpdate(
    { roomCode: "EMR101" },
    {
      departmentId,
      roomCode: "EMR101",
      roomNumber: "EMR-101",
      name: "EMR Demo Room 101",
      floor: "2",
      capacity: 1,
      isActive: true,
      status: "active",
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const today = startOfToday();
  const signedVisitDate = addDays(today, -10);

  const demoVisits = [
    {
      key: "draft-signoff",
      date: today,
      startTime: "14:00",
      endTime: "14:30",
      reason: "Follow-up consultation for EMR sign-off demo",
      status: "draft",
      chiefComplaint: "Follow-up cough and mild fever",
      clinicalNotes: "Patient reports dry cough for two days. No chest pain. Hydration and rest advised.",
      vitals: { temperatureC: 37.8, bloodPressure: "118/76", pulse: 82 },
      diagnoses: [{ code: "R05", text: "Cough", note: "Mild symptoms" }],
    },
    {
      key: "signed-history",
      date: signedVisitDate,
      startTime: "09:00",
      endTime: "09:30",
      reason: "Completed cardiology follow-up",
      status: "signed",
      chiefComplaint: "Blood pressure follow-up",
      clinicalNotes: "Blood pressure stable. Continue current lifestyle plan and recheck in one month.",
      vitals: { temperatureC: 36.7, bloodPressure: "120/80", pulse: 76 },
      diagnoses: [{ code: "I10", text: "Essential hypertension", note: "Stable follow-up" }],
    },
  ];

  for (const visit of demoVisits) {
    const slot = await AppointmentSlot.findOneAndUpdate(
      {
        doctorId: doctor._id,
        date: visit.date,
        startTime: visit.startTime,
      },
      {
        doctorId: doctor._id,
        workShiftId: new mongoose.Types.ObjectId(),
        roomId: room._id,
        date: visit.date,
        startTime: visit.startTime,
        endTime: visit.endTime,
        status: "booked",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const appointment = await Appointment.findOneAndUpdate(
      { slotId: slot._id },
      {
        patientUserId: patientUser._id,
        doctorId: doctor._id,
        slotId: slot._id,
        reason: visit.reason,
        fee: doctor.consultationFee || 250000,
        status: "completed",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await Encounter.findOneAndUpdate(
      { appointmentId: appointment._id },
      {
        patientUserId: patientUser._id,
        doctorId: doctor._id,
        appointmentId: appointment._id,
        visitDate: new Date(visit.date.getTime() + 8 * 60 * 60 * 1000),
        chiefComplaint: visit.chiefComplaint,
        clinicalNotes: visit.clinicalNotes,
        vitals: visit.vitals,
        diagnoses: visit.diagnoses,
        status: visit.status,
        signedOffAt: visit.status === "signed" ? new Date(visit.date.getTime() + 10 * 60 * 60 * 1000) : null,
        signedOffBy: visit.status === "signed" ? signedOffBy : null,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  const draftAppointment = await Appointment.findOne({
    patientUserId: patientUser._id,
    doctorId: doctor._id,
    reason: "Follow-up consultation for EMR sign-off demo",
  });
  const draftEncounter = draftAppointment
    ? await Encounter.findOne({ appointmentId: draftAppointment._id })
    : null;

  if (draftEncounter) {
    await MedicalImage.findOneAndUpdate(
      { encounterId: draftEncounter._id, title: "Demo chest X-ray" },
      {
        encounterId: draftEncounter._id,
        patientUserId: patientUser._id,
        uploadedBy: signedOffBy,
        type: "xray",
        title: "Demo chest X-ray",
        url: "https://images.unsplash.com/photo-1583912267550-d6c2ac2b0152?auto=format&fit=crop&w=1200&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1583912267550-d6c2ac2b0152?auto=format&fit=crop&w=500&q=80",
        mimeType: "image/jpeg",
        sizeBytes: 204800,
        deletedAt: null,
        deletedBy: null,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const demoMedicine = await Medicine.findOne({ code: "PARA500" });
    if (demoMedicine) {
      const quantity = 10;
      const lineTotal = (demoMedicine.price || 0) * quantity;
      await Prescription.findOneAndUpdate(
        { encounterId: draftEncounter._id, "lineItems.medicineCode": demoMedicine.code },
        {
          encounterId: draftEncounter._id,
          patientUserId: patientUser._id,
          doctorId: doctor._id,
          status: "draft",
          notes: "Take medicine only if fever or pain continues.",
          lineItems: [
            {
              medicineId: demoMedicine._id,
              medicineName: demoMedicine.name,
              medicineCode: demoMedicine.code,
              unit: demoMedicine.unit,
              quantity,
              durationDays: 5,
              dosage: "1 tablet twice daily",
              instructions: "After meals",
              unitPrice: demoMedicine.price || 0,
              lineTotal,
              stockSnapshot: demoMedicine.stockQty || 0,
              stockWarning: quantity > (demoMedicine.stockQty || 0),
            },
          ],
          totalAmount: lineTotal,
          createdBy: signedOffBy,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
  }
}

export async function runSeed() {
  const defaultAdminHash = await bcrypt.hash("Admin@123", 10);
  let admin = await User.findOne({ email: "admin@orcaxcare.com" });
  if (!admin) {
    await User.create({
      email: "admin@orcaxcare.com",
      passwordHash: defaultAdminHash,
      role: "admin",
      fullName: "System Administrator",
      isActive: true,
      isEmailVerified: true,
    });
    console.log("Created admin: admin@orcaxcare.com / Admin@123");
  }

  const truongAdminHash = await bcrypt.hash("Truong123@", 10);
  let truongAdmin = await User.findOne({ email: "truongtn.dev@gmail.com" });
  if (!truongAdmin) {
    await User.create({
      email: "truongtn.dev@gmail.com",
      passwordHash: truongAdminHash,
      role: "admin",
      fullName: "Nguyen Thanh Truong",
      isActive: true,
      isEmailVerified: true,
    });
    console.log("Created admin: truongtn.dev@gmail.com / Truong123@");
  } else if (truongAdmin.role !== "admin") {
    truongAdmin.role = "admin";
    truongAdmin.passwordHash = truongAdminHash;
    truongAdmin.isActive = true;
    truongAdmin.isEmailVerified = true;
    await truongAdmin.save();
    console.log("Updated to admin: truongtn.dev@gmail.com / Truong123@");
  }

  for (const s of specialties) {
    await Specialty.findOneAndUpdate({ code: s.code }, s, { upsert: true, new: true });
  }

  for (const d of departments) {
    await Department.findOneAndUpdate({ name: d.name }, d, { upsert: true, new: true });
  }

  const specMap = Object.fromEntries(
    (await Specialty.find()).map((s) => [s.code, s._id])
  );
  const deptMap = Object.fromEntries(
    (await Department.find()).map((d) => [d.name, d._id])
  );

  const patientHash = await bcrypt.hash("Patient@123", 10);
  let patientUser = await User.findOne({ email: "patient@orcaxcare.com" });
  if (!patientUser) {
    patientUser = await User.create({
      email: "patient@orcaxcare.com",
      passwordHash: patientHash,
      role: "patient",
      fullName: "Demo Patient",
      phone: "0912345678",
      isActive: true,
      isEmailVerified: true,
    });
    await Patient.create({ userId: patientUser._id, isActive: true });
    console.log("Created patient: patient@orcaxcare.com / Patient@123");
  }
  await Patient.findOneAndUpdate(
    { userId: patientUser._id },
    { userId: patientUser._id, isActive: true },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const staffHash = await bcrypt.hash("Staff@123", 10);
  let staffUser = await User.findOne({ email: "staff@orcaxcare.com" });
  if (!staffUser) {
    staffUser = await User.create({
      email: "staff@orcaxcare.com",
      passwordHash: staffHash,
      role: "staff",
      fullName: "Demo Reception Staff",
      phone: "0987654321",
      isActive: true,
      isEmailVerified: true,
    });
    console.log("Created staff: staff@orcaxcare.com / Staff@123");
  }

  for (const doc of doctors) {
    let user = await User.findOne({ email: doc.email });
    if (!user) {
      user = await User.create({
        email: doc.email,
        passwordHash: await bcrypt.hash("Doctor@123", 10),
        role: "doctor",
        fullName: doc.fullName,
        phone: "0900000000",
        isActive: true,
        isEmailVerified: true,
      });
    }
    await Doctor.findOneAndUpdate(
      { userId: user._id },
      {
        userId: user._id,
        specialtyId: specMap[doc.specialty],
        departmentId: deptMap[doc.department],
        licenseNo: doc.licenseNo,
        bio: doc.bio,
        consultationFee: doc.consultationFee,
        isActive: true,
      },
      { upsert: true, new: true }
    );
  }

  await ensureAllDoctorSlugs();

  const defaultMedicines = [
    { code: "PARA500", name: "Paracetamol 500mg", unit: "tablet", price: 1200, stockQty: 120, minStockLevel: 30 },
    { code: "AMOX500", name: "Amoxicillin 500mg", unit: "capsule", price: 2500, stockQty: 45, minStockLevel: 40 },
    { code: "VITC1000", name: "Vitamin C 1000mg", unit: "tablet", price: 1800, stockQty: 80, minStockLevel: 25 },
  ];
  for (const med of defaultMedicines) {
    await Medicine.findOneAndUpdate({ code: med.code }, med, { upsert: true, new: true });
  }

  if (staffUser) {
    const demoBatches = [
      { code: "PARA500", batchNo: "PARA-LOT-01", quantity: 120, expiryDate: "2027-08-31", supplierRef: "SUP-PARA" },
      { code: "AMOX500", batchNo: "AMOX-LOT-02", quantity: 45, expiryDate: "2027-03-15", supplierRef: "SUP-AMOX" },
      { code: "VITC1000", batchNo: "VITC-LOT-01", quantity: 80, expiryDate: "2028-01-20", supplierRef: "SUP-VITC" },
    ];

    for (const batch of demoBatches) {
      const medicine = await Medicine.findOne({ code: batch.code });
      if (!medicine) continue;
      await StockMovement.findOneAndUpdate(
        { medicineId: medicine._id, type: "inbound", batchNo: batch.batchNo },
        {
          medicineId: medicine._id,
          type: "inbound",
          quantity: batch.quantity,
          batchNo: batch.batchNo,
          expiryDate: new Date(`${batch.expiryDate}T00:00:00.000Z`),
          supplierRef: batch.supplierRef,
          note: "Seed inventory batch",
          performedBy: staffUser._id,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
  }

  const demoDoctor = await Doctor.findOne({ licenseNo: "LIC-001" }).populate("userId", "fullName email");
  if (patientUser && demoDoctor) {
    await upsertEncounterDemoData({
      patientUser,
      doctor: demoDoctor,
      departmentId: deptMap["Internal Medicine"],
      signedOffBy: demoDoctor.userId?._id,
    });
    console.log("Created EMR demo encounters for patient@orcaxcare.com and doctor.an@orcaxcare.com.");
  }

  console.log("Seed data ready (admin + staff + doctors + master data).");
}
