import { User } from "../models/User.js";
import { Patient } from "../models/Patient.js";
import { Doctor } from "../models/Doctor.js";

const GENDERS = ["male", "female", "other"];

function formatUser(user) {
  return {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
    fullName: user.fullName,
    phone: user.phone || "",
    isEmailVerified: user.isEmailVerified,
  };
}

export async function getProfile(userId, role) {
  const user = await User.findById(userId);
  if (!user) return { status: 404, body: { message: "User not found" } };

  const base = formatUser(user);

  if (role === "patient") {
    let patient = await Patient.findOne({ userId: user._id });
    if (!patient) {
      patient = await Patient.create({ userId: user._id });
    }
    return {
      status: 200,
      body: {
        ...base,
        profile: {
          dateOfBirth: patient.dateOfBirth ? patient.dateOfBirth.toISOString().slice(0, 10) : "",
          gender: patient.gender || "",
          address: patient.address || "",
          emergencyContactName: patient.emergencyContactName || "",
          emergencyContactPhone: patient.emergencyContactPhone || "",
        },
      },
    };
  }

  if (role === "doctor") {
    const doctor = await Doctor.findOne({ userId: user._id })
      .populate("specialtyId", "name code")
      .populate("departmentId", "name")
      .lean();
    if (!doctor) return { status: 404, body: { message: "Doctor profile not found" } };

    return {
      status: 200,
      body: {
        ...base,
        profile: {
          bio: doctor.bio || "",
          licenseNo: doctor.licenseNo,
          specialty: doctor.specialtyId
            ? { id: doctor.specialtyId._id, name: doctor.specialtyId.name }
            : null,
          department: doctor.departmentId
            ? { id: doctor.departmentId._id, name: doctor.departmentId.name }
            : null,
        },
      },
    };
  }

  return { status: 200, body: { ...base, profile: {} } };
}

export async function updateProfile(userId, role, payload) {
  const user = await User.findById(userId);
  if (!user) return { status: 404, body: { message: "User not found" } };

  const fullName = payload.fullName?.trim();
  if (!fullName) return { status: 400, body: { message: "Full name is required" } };

  const phone = payload.phone?.trim() || "";
  if (phone && !/^[\d\s+\-()]{8,20}$/.test(phone)) {
    return { status: 400, body: { message: "Invalid phone number" } };
  }

  user.fullName = fullName;
  user.phone = phone;
  await user.save();

  if (role === "patient") {
    let patient = await Patient.findOne({ userId: user._id });
    if (!patient) patient = await Patient.create({ userId: user._id });

    const gender = payload.gender?.trim() || "";
    if (gender && !GENDERS.includes(gender)) {
      return { status: 400, body: { message: "Invalid gender value" } };
    }

    if (payload.dateOfBirth) {
      const dob = new Date(payload.dateOfBirth);
      if (Number.isNaN(dob.getTime()) || dob > new Date()) {
        return { status: 400, body: { message: "Invalid date of birth" } };
      }
      patient.dateOfBirth = dob;
    } else {
      patient.dateOfBirth = null;
    }

    patient.gender = gender;
    patient.address = payload.address?.trim() || "";
    patient.emergencyContactName = payload.emergencyContactName?.trim() || "";
    patient.emergencyContactPhone = payload.emergencyContactPhone?.trim() || "";
    await patient.save();
  }

  if (role === "doctor") {
    const doctor = await Doctor.findOne({ userId: user._id });
    if (!doctor) return { status: 404, body: { message: "Doctor profile not found" } };
    doctor.bio = payload.bio?.trim()?.slice(0, 1000) || "";
    await doctor.save();
  }

  return getProfile(userId, role);
}
