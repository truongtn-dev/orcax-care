import mongoose from "mongoose";
import { Department } from "../models/Department.js";
import { Doctor } from "../models/Doctor.js";
import { Room } from "../models/Room.js";
import { Specialty } from "../models/Specialty.js";
import { invalidateSearchCache } from "./doctorSearch.service.js";
import { validatePhoneOptional, validateRequired } from "../utils/validation.js";

function mapSpecialty(specialty) {
  return {
    _id: specialty._id.toString(),
    code: specialty.code,
    name: specialty.name,
    description: specialty.description || "",
    isActive: specialty.isActive,
    createdAt: specialty.createdAt.toISOString(),
    updatedAt: specialty.updatedAt.toISOString(),
  };
}

function mapDepartment(department) {
  return {
    _id: department._id.toString(),
    name: department.name,
    location: department.location || "",
    phone: department.phone || "",
    isActive: department.isActive,
    createdAt: department.createdAt.toISOString(),
    updatedAt: department.updatedAt.toISOString(),
  };
}

function mapRoom(room) {
  return {
    _id: room._id.toString(),
    name: room.name,
    floor: room.floor || "",
    isActive: room.isActive,
    createdAt: room.createdAt.toISOString(),
    updatedAt: room.updatedAt.toISOString(),
  };
}

export async function listSpecialties({ activeOnly = true } = {}) {
  const filter = activeOnly ? { isActive: true } : {};
  const specialties = await Specialty.find(filter).sort({ name: 1 }).lean();
  return {
    status: 200,
    body: { items: specialties.map(mapSpecialty) },
  };
}

export async function listDepartments({ activeOnly = true } = {}) {
  const filter = activeOnly ? { isActive: true } : {};
  const departments = await Department.find(filter).sort({ name: 1 }).lean();
  return {
    status: 200,
    body: { items: departments.map(mapDepartment) },
  };
}

export async function createDepartment(dto) {
  const name = String(dto.name || "").trim();
  const location = String(dto.location || "").trim();
  const phone = String(dto.phone || "").trim();

  const nameError = validateRequired(name, "Department name");
  if (nameError) return { status: 400, body: { message: nameError } };
  const locationError = validateRequired(location, "Location");
  if (locationError) return { status: 400, body: { message: locationError } };
  const phoneRequiredError = validateRequired(phone, "Phone number");
  if (phoneRequiredError) return { status: 400, body: { message: phoneRequiredError } };
  const phoneError = validatePhoneOptional(phone);
  if (phoneError) return { status: 400, body: { message: phoneError } };

  const duplicate = await Department.findOne({ name }).lean();
  if (duplicate) return { status: 409, body: { message: "Department already exists" } };

  const department = await Department.create({
    name,
    location,
    phone,
    isActive: typeof dto.isActive === "boolean" ? dto.isActive : true,
  });
  invalidateSearchCache();

  return { status: 201, body: mapDepartment(department) };
}

export async function updateDepartment(id, dto) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { status: 404, body: { message: "Department not found" } };
  }

  const department = await Department.findById(id);
  if (!department) return { status: 404, body: { message: "Department not found" } };

  const name = dto.name !== undefined ? String(dto.name || "").trim() : department.name;
  const location = dto.location !== undefined ? String(dto.location || "").trim() : department.location;
  const phone = dto.phone !== undefined ? String(dto.phone || "").trim() : department.phone;

  const nameError = validateRequired(name, "Department name");
  if (nameError) return { status: 400, body: { message: nameError } };
  const locationError = validateRequired(location, "Location");
  if (locationError) return { status: 400, body: { message: locationError } };
  const phoneRequiredError = validateRequired(phone, "Phone number");
  if (phoneRequiredError) return { status: 400, body: { message: phoneRequiredError } };
  const phoneError = validatePhoneOptional(phone);
  if (phoneError) return { status: 400, body: { message: phoneError } };

  if (name !== department.name) {
    const duplicate = await Department.findOne({ name, _id: { $ne: department._id } }).lean();
    if (duplicate) return { status: 409, body: { message: "Department name already exists" } };
  }

  department.name = name;
  department.location = location;
  department.phone = phone;
  if (typeof dto.isActive === "boolean") {
    department.isActive = dto.isActive;
  }

  await department.save();
  invalidateSearchCache();

  return {
    status: 200,
    body: {
      message: "Department updated successfully",
      department: mapDepartment(department),
    },
  };
}

export async function deactivateDepartment(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { status: 404, body: { message: "Department not found" } };
  }

  const department = await Department.findById(id);
  if (!department) return { status: 404, body: { message: "Department not found" } };

  if (!department.isActive) {
    return { status: 400, body: { message: "Department is already inactive" } };
  }

  const doctors = await Doctor.find({ departmentId: department._id, isActive: true })
    .populate("userId", "isActive")
    .lean();
  const activeDoctorCount = doctors.filter((doctor) => doctor.userId?.isActive).length;

  if (activeDoctorCount > 0) {
    return {
      status: 409,
      body: {
        message: `Cannot deactivate department. ${activeDoctorCount} active doctor(s) are still assigned.`,
        activeDoctorCount,
      },
    };
  }

  department.isActive = false;
  await department.save();
  invalidateSearchCache();

  return {
    status: 200,
    body: {
      message: "Department deactivated successfully",
      department: mapDepartment(department),
    },
  };
}

export async function getDepartmentDetail(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { status: 404, body: { message: "Department not found" } };
  }

  const department = await Department.findById(id);
  if (!department) return { status: 404, body: { message: "Department not found" } };

  const doctors = await Doctor.find({ departmentId: department._id })
    .populate("userId", "fullName isActive")
    .populate("specialtyId", "name")
    .sort({ createdAt: 1 })
    .lean();
  const rooms = await Room.find({ departmentId: department._id }).sort({ name: 1 }).lean();

  const mappedDoctors = doctors
    .map((doctor) => {
      const doctorActive = Boolean(doctor.isActive && doctor.userId?.isActive);
      return {
        _id: doctor._id.toString(),
        fullName: doctor.userId?.fullName || "Unknown doctor",
        specialtyName: doctor.specialtyId?.name || "",
        isActive: doctorActive,
      };
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
  const mappedRooms = rooms.map(mapRoom);

  return {
    status: 200,
    body: {
      department: mapDepartment(department),
      summary: {
        activeDoctors: mappedDoctors.filter((doctor) => doctor.isActive).length,
        totalDoctors: mappedDoctors.length,
        activeRooms: mappedRooms.filter((room) => room.isActive).length,
        totalRooms: mappedRooms.length,
      },
      rooms: mappedRooms,
      doctors: mappedDoctors,
    },
  };
}
