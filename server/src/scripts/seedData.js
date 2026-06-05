import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { Specialty } from "../models/Specialty.js";
import { Department } from "../models/Department.js";
import { Doctor } from "../models/Doctor.js";

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
  { fullName: "Dr. Nguyen Van An", email: "doctor.an@orcaxcare.com", specialty: "CARD", department: "Internal Medicine", licenseNo: "LIC-001", bio: "15 years experience in cardiology." },
  { fullName: "Dr. Tran Thi Binh", email: "doctor.binh@orcaxcare.com", specialty: "DERM", department: "Internal Medicine", licenseNo: "LIC-002", bio: "Specialist in dermatology and skin care." },
  { fullName: "Dr. Le Minh Cuong", email: "doctor.cuong@orcaxcare.com", specialty: "PED", department: "Pediatrics Ward", licenseNo: "LIC-003", bio: "Pediatrician with focus on preventive care." },
  { fullName: "Dr. Pham Hoai Duc", email: "doctor.duc@orcaxcare.com", specialty: "NEUR", department: "Surgery", licenseNo: "LIC-004", bio: "Neurology and neurosurgery consultant." },
  { fullName: "Dr. Vo Thi Em", email: "doctor.em@orcaxcare.com", specialty: "ORTH", department: "Surgery", licenseNo: "LIC-005", bio: "Orthopedic surgeon — sports injuries." },
  { fullName: "Dr. Hoang Quoc Giang", email: "doctor.giang@orcaxcare.com", specialty: "CARD", department: "Internal Medicine", licenseNo: "LIC-006", bio: "Interventional cardiology." },
];

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
        isActive: true,
      },
      { upsert: true, new: true }
    );
  }

  console.log("Seed data ready (admin + doctors + master data).");
}
