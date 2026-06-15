import mongoose from "mongoose";
import { FavoriteDoctor } from "../models/FavoriteDoctor.js";
import { Doctor } from "../models/Doctor.js";

function serializeDoctor(doctor) {
  return {
    _id: doctor._id.toString(),
    fullName: doctor.userId?.fullName || "",
    email: doctor.userId?.email || "",
    phone: doctor.userId?.phone || "",
    bio: doctor.bio || "",
    photoUrl: doctor.photoUrl || doctor.userId?.photoUrl || "",
    licenseNo: doctor.licenseNo || "",
    specialty: doctor.specialtyId
      ? {
          _id: doctor.specialtyId._id.toString(),
          name: doctor.specialtyId.name,
          code: doctor.specialtyId.code,
        }
      : null,
    department: doctor.departmentId
      ? {
          _id: doctor.departmentId._id.toString(),
          name: doctor.departmentId.name,
        }
      : null,
  };
}

async function findActiveDoctor(doctorId) {
  if (!doctorId || !mongoose.Types.ObjectId.isValid(doctorId)) {
    return null;
  }

  const doctor = await Doctor.findOne({ _id: doctorId, isActive: true })
    .populate("userId", "fullName email phone photoUrl isActive")
    .populate("specialtyId", "name code")
    .populate("departmentId", "name")
    .lean();

  if (!doctor || !doctor.userId?.isActive) {
    return null;
  }

  return doctor;
}

export async function listFavoriteDoctors(userId) {
  const favorites = await FavoriteDoctor.find({ userId })
    .sort({ createdAt: -1 })
    .select("doctorId createdAt")
    .lean();

  if (!favorites.length) {
    return { status: 200, body: { items: [], total: 0 } };
  }

  const doctorIds = favorites.map((item) => item.doctorId);
  const doctors = await Doctor.find({ _id: { $in: doctorIds }, isActive: true })
    .populate("userId", "fullName email phone photoUrl isActive")
    .populate("specialtyId", "name code")
    .populate("departmentId", "name")
    .lean();

  const doctorById = new Map(
    doctors
      .filter((doctor) => doctor.userId?.isActive)
      .map((doctor) => [doctor._id.toString(), doctor])
  );

  const items = favorites
    .map((favorite) => {
      const doctor = doctorById.get(favorite.doctorId.toString());
      if (!doctor) return null;

      return {
        favoriteId: favorite._id.toString(),
        doctorId: favorite.doctorId.toString(),
        createdAt: favorite.createdAt,
        doctor: serializeDoctor(doctor),
      };
    })
    .filter(Boolean);

  return {
    status: 200,
    body: {
      items,
      total: items.length,
    },
  };
}

export async function addFavoriteDoctor(userId, doctorId) {
  const doctor = await findActiveDoctor(doctorId);
  if (!doctor) {
    return { status: 404, body: { message: "Doctor not found" } };
  }

  const existing = await FavoriteDoctor.findOne({ userId, doctorId: doctor._id }).lean();
  if (existing) {
    return {
      status: 200,
      body: {
        favoriteId: existing._id.toString(),
        doctorId: doctor._id.toString(),
        doctor: serializeDoctor(doctor),
      },
    };
  }

  const favorite = await FavoriteDoctor.create({ userId, doctorId: doctor._id });
  return {
    status: 201,
    body: {
      favoriteId: favorite._id.toString(),
      doctorId: doctor._id.toString(),
      doctor: serializeDoctor(doctor),
    },
  };
}

export async function removeFavoriteDoctor(userId, doctorId) {
  if (!doctorId || !mongoose.Types.ObjectId.isValid(doctorId)) {
    return { status: 400, body: { message: "Invalid doctor" } };
  }

  const removed = await FavoriteDoctor.findOneAndDelete({ userId, doctorId });
  if (!removed) {
    return { status: 404, body: { message: "Doctor is not in favorites" } };
  }

  return {
    status: 200,
    body: {
      message: "Doctor removed from favorites",
      doctorId: String(doctorId),
    },
  };
}
