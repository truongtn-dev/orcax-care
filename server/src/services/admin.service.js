import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { User } from "../models/User.js";
import { Doctor } from "../models/Doctor.js";
import { Specialty } from "../models/Specialty.js";
import { Department } from "../models/Department.js";
import { Patient } from "../models/Patient.js";
import { ClinicRoom } from "../models/ClinicRoom.js";
import { revokeAllUserTokens } from "./token.service.js";
import { invalidateSearchCache } from "./doctorSearch.service.js";
import { validateEmail, validatePasswordStrength } from "../utils/validation.js";





export async function createStaffAccount({
  email,
  password,
  fullName,
  phone,
  role = "staff",
  specialtyId,
  departmentId,
  licenseNo,
  bio,
  dateOfBirth,
  gender,
  address,
  emergencyContactName,
  emergencyContactPhone,
}) {
  const validRoles = ["patient", "doctor", "admin", "staff"];
  if (!validRoles.includes(role)) {
    return { status: 400, body: { message: "Invalid role value" } };
  }

  const emailError = validateEmail(email);
  if (emailError) return { status: 400, body: { message: emailError } };

  const pwdError = validatePasswordStrength(password);
  if (pwdError) return { status: 400, body: { message: pwdError } };

  if (!fullName?.trim()) {
    return { status: 400, body: { message: "Full name is required" } };
  }

  const normalizedEmail = email.toLowerCase().trim();
  const exists = await User.findOne({ email: normalizedEmail });
  if (exists) {
    return { status: 409, body: { message: "Email already registered" } };
  }

  
  if (role === "doctor") {
    if (!specialtyId || !mongoose.Types.ObjectId.isValid(specialtyId)) {
      return { status: 400, body: { message: "Valid specialty is required for doctor role" } };
    }
    if (!departmentId || !mongoose.Types.ObjectId.isValid(departmentId)) {
      return { status: 400, body: { message: "Valid department is required for doctor role" } };
    }
    if (!licenseNo?.trim()) {
      return { status: 400, body: { message: "License number is required for doctor role" } };
    }

    const specialtyExists = await Specialty.findById(specialtyId);
    if (!specialtyExists) return { status: 400, body: { message: "Specialty does not exist" } };

    const departmentExists = await Department.findById(departmentId);
    if (!departmentExists) return { status: 400, body: { message: "Department does not exist" } };

    const licenseExists = await Doctor.findOne({ licenseNo: licenseNo.trim() });
    if (licenseExists) {
      return { status: 409, body: { message: "License number is already in use by another doctor" } };
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    email: normalizedEmail,
    passwordHash,
    role,
    fullName: fullName.trim(),
    phone: phone?.trim() || "",
    isActive: true,
    isEmailVerified: true,
    isLocked: false,
  });

  if (role === "doctor") {
    await Doctor.create({
      userId: user._id,
      specialtyId,
      departmentId,
      licenseNo: licenseNo.trim(),
      bio: bio?.trim() || "",
      isActive: true,
    });
  } else if (role === "patient") {
    await Patient.create({
      userId: user._id,
      dateOfBirth: dateOfBirth || null,
      gender: gender || "",
      address: address || "",
      emergencyContactName: emergencyContactName || "",
      emergencyContactPhone: emergencyContactPhone || "",
      isActive: true,
    });
  }

  return {
    status: 201,
    body: {
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} account created successfully`,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isActive: user.isActive,
      },
    },
  };
}

export async function listAllUsers() {
  const users = await User.find().select("-passwordHash").sort({ createdAt: -1 });
  return { status: 200, body: { items: users } };
}

export async function changeUserRole(userId, { role, specialtyId, departmentId, licenseNo, bio }) {
  const validRoles = ["patient", "doctor", "admin", "staff"];
  if (!validRoles.includes(role)) {
    return { status: 400, body: { message: "Invalid role value" } };
  }

  const user = await User.findById(userId);
  if (!user) {
    return { status: 404, body: { message: "User not found" } };
  }

  if (role === "doctor") {
    if (!specialtyId || !mongoose.Types.ObjectId.isValid(specialtyId)) {
      return { status: 400, body: { message: "Valid specialty is required for doctor role" } };
    }
    if (!departmentId || !mongoose.Types.ObjectId.isValid(departmentId)) {
      return { status: 400, body: { message: "Valid department is required for doctor role" } };
    }
    if (!licenseNo?.trim()) {
      return { status: 400, body: { message: "License number is required for doctor role" } };
    }

    const specialtyExists = await Specialty.findById(specialtyId);
    if (!specialtyExists) return { status: 400, body: { message: "Specialty does not exist" } };

    const departmentExists = await Department.findById(departmentId);
    if (!departmentExists) return { status: 400, body: { message: "Department does not exist" } };

    const existingDoc = await Doctor.findOne({ userId });
    if (existingDoc) {
      existingDoc.specialtyId = specialtyId;
      existingDoc.departmentId = departmentId;
      existingDoc.licenseNo = licenseNo.trim();
      existingDoc.bio = bio?.trim() || existingDoc.bio;
      existingDoc.isActive = user.isActive;
      await existingDoc.save();
    } else {
      const licenseExists = await Doctor.findOne({ licenseNo: licenseNo.trim() });
      if (licenseExists) {
        return { status: 409, body: { message: "License number is already in use by another doctor" } };
      }

      await Doctor.create({
        userId: user._id,
        specialtyId,
        departmentId,
        licenseNo: licenseNo.trim(),
        bio: bio?.trim() || "",
        isActive: user.isActive,
      });
    }
  } else if (role === "patient") {
    const existingPatient = await Patient.findOne({ userId });
    if (!existingPatient) {
      await Patient.create({
        userId: user._id,
        isActive: user.isActive,
      });
    }
  }

  user.role = role;
  user.passwordChangedAt = new Date();
  await user.save();

  await revokeAllUserTokens(userId);

  return {
    status: 200,
    body: {
      message: `User role updated successfully to ${role}. All active sessions revoked.`,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    },
  };
}

export async function deactivateAccount(userId, adminUserId) {
  if (adminUserId === userId) {
    return { status: 400, body: { message: "You cannot deactivate your own account" } };
  }

  const user = await User.findById(userId);
  if (!user) {
    return { status: 404, body: { message: "User not found" } };
  }

  user.isActive = false;
  await user.save();

  await Doctor.updateOne({ userId }, { $set: { isActive: false } });
  await Patient.updateOne({ userId }, { $set: { isActive: false } });

  await revokeAllUserTokens(userId);

  return { status: 200, body: { message: "Account deactivated successfully. Active sessions terminated." } };
}

export async function reactivateAccount(userId) {
  const user = await User.findById(userId);
  if (!user) {
    return { status: 404, body: { message: "User not found" } };
  }

  user.isActive = true;
  await user.save();

  await Doctor.updateOne({ userId }, { $set: { isActive: true } });
  await Patient.updateOne({ userId }, { $set: { isActive: true } });

  return { status: 200, body: { message: "Account reactivated successfully" } };
}





export async function createSpecialty({ code, name, description, isActive }) {
  if (!code?.trim() || !name?.trim()) {
    return { status: 400, body: { message: "Code and name are required" } };
  }

  const upperCode = code.trim().toUpperCase();
  const cleanName = name.trim();

  const codeExists = await Specialty.findOne({ code: upperCode });
  if (codeExists) {
    return { status: 409, body: { message: "Specialty code already exists" } };
  }

  const nameExists = await Specialty.findOne({ name: cleanName });
  if (nameExists) {
    return { status: 409, body: { message: "Specialty name already exists" } };
  }

  const specialty = await Specialty.create({
    code: upperCode,
    name: cleanName,
    description: description?.trim() || "",
    isActive: isActive !== undefined ? isActive : true,
  });

  invalidateSearchCache();

  return {
    status: 201,
    body: {
      message: "Specialty created successfully",
      specialty,
    },
  };
}

export async function updateSpecialty(specialtyId, { code, name, description, isActive }) {
  const specialty = await Specialty.findById(specialtyId);
  if (!specialty) {
    return { status: 404, body: { message: "Specialty not found" } };
  }

  if (code?.trim()) {
    const upperCode = code.trim().toUpperCase();
    if (upperCode !== specialty.code) {
      const codeExists = await Specialty.findOne({ code: upperCode });
      if (codeExists) {
        return { status: 409, body: { message: "Specialty code already exists" } };
      }
      specialty.code = upperCode;
    }
  }

  if (name?.trim()) {
    const cleanName = name.trim();
    if (cleanName !== specialty.name) {
      const nameExists = await Specialty.findOne({ name: cleanName });
      if (nameExists) {
        return { status: 409, body: { message: "Specialty name already exists" } };
      }
      specialty.name = cleanName;
    }
  }

  if (description !== undefined) specialty.description = description.trim();
  if (isActive !== undefined) specialty.isActive = isActive;

  await specialty.save();
  invalidateSearchCache();

  return {
    status: 200,
    body: {
      message: "Specialty updated successfully",
      specialty,
    },
  };
}





export async function listClinicRooms() {
  const rooms = await ClinicRoom.find()
    .populate("specialtyId", "name code")
    .sort({ roomNumber: 1 });
  return { status: 200, body: { items: rooms } };
}

export async function createClinicRoom({ roomNumber, name, specialtyId, status }) {
  if (!roomNumber?.trim() || !name?.trim() || !specialtyId) {
    return { status: 400, body: { message: "Room number, name and specialtyId are required" } };
  }

  if (!mongoose.Types.ObjectId.isValid(specialtyId)) {
    return { status: 400, body: { message: "Invalid specialty ID" } };
  }

  const specialtyExists = await Specialty.findById(specialtyId);
  if (!specialtyExists) {
    return { status: 400, body: { message: "Specialty does not exist" } };
  }

  const roomExists = await ClinicRoom.findOne({ roomNumber: roomNumber.trim() });
  if (roomExists) {
    return { status: 409, body: { message: "Room number already exists" } };
  }

  const room = await ClinicRoom.create({
    roomNumber: roomNumber.trim(),
    name: name.trim(),
    specialtyId,
    status: status || "active",
  });

  return {
    status: 201,
    body: {
      message: "Clinic room created successfully",
      room,
    },
  };
}

export async function updateClinicRoom(roomId, { roomNumber, name, specialtyId, status }) {
  const room = await ClinicRoom.findById(roomId);
  if (!room) {
    return { status: 404, body: { message: "Clinic room not found" } };
  }

  if (roomNumber?.trim()) {
    const cleanNumber = roomNumber.trim();
    if (cleanNumber !== room.roomNumber) {
      const numberExists = await ClinicRoom.findOne({ roomNumber: cleanNumber });
      if (numberExists) {
        return { status: 409, body: { message: "Room number already exists" } };
      }
      room.roomNumber = cleanNumber;
    }
  }

  if (name?.trim()) room.name = name.trim();

  if (specialtyId) {
    if (!mongoose.Types.ObjectId.isValid(specialtyId)) {
      return { status: 400, body: { message: "Invalid specialty ID" } };
    }
    const specialtyExists = await Specialty.findById(specialtyId);
    if (!specialtyExists) {
      return { status: 400, body: { message: "Specialty does not exist" } };
    }
    room.specialtyId = specialtyId;
  }

  if (status) room.status = status;

  await room.save();

  const populatedRoom = await ClinicRoom.findById(room._id).populate("specialtyId", "name code");

  return {
    status: 200,
    body: {
      message: "Clinic room updated successfully",
      room: populatedRoom,
    },
  };
}





export async function viewDoctorsList({ isActive, specialtyId, departmentId, name, page = 1, limit = 10 }) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

  const matchStage = {};

  if (isActive !== undefined && isActive !== "all") {
    matchStage.isActive = isActive === "true";
  }

  if (specialtyId && mongoose.Types.ObjectId.isValid(specialtyId)) {
    matchStage.specialtyId = new mongoose.Types.ObjectId(specialtyId);
  }

  if (departmentId && mongoose.Types.ObjectId.isValid(departmentId)) {
    matchStage.departmentId = new mongoose.Types.ObjectId(departmentId);
  }

  const pipeline = [
    { $match: matchStage },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    ...(name?.trim() ? [{ $match: { "user.fullName": { $regex: name.trim(), $options: "i" } } }] : []),
    {
      $lookup: {
        from: "specialties",
        localField: "specialtyId",
        foreignField: "_id",
        as: "specialty",
      },
    },
    { $unwind: { path: "$specialty", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "departments",
        localField: "departmentId",
        foreignField: "_id",
        as: "department",
      },
    },
    { $unwind: { path: "$department", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        bio: 1,
        photoUrl: 1,
        licenseNo: 1,
        isActive: 1,
        fullName: "$user.fullName",
        email: "$user.email",
        phone: "$user.phone",
        userIsActive: "$user.isActive",
        specialty: {
          _id: "$specialty._id",
          name: "$specialty.name",
          code: "$specialty.code",
        },
        department: {
          _id: "$department._id",
          name: "$department.name",
        },
        specialtyId: 1,
        departmentId: 1,
        userId: 1,
      },
    },
    { $sort: { fullName: 1 } },
  ];

  const allRecords = await Doctor.aggregate(pipeline);
  const total = allRecords.length;

  const skip = (pageNum - 1) * limitNum;
  const items = allRecords.slice(skip, skip + limitNum);

  return {
    status: 200,
    body: {
      items,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}
