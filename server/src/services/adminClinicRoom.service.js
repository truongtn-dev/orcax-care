import mongoose from "mongoose";
import { ClinicRoom } from "../models/ClinicRoom.js";
import { Department } from "../models/Department.js";
import { Specialty } from "../models/Specialty.js";

function serializeClinicRoom(room) {
  const specialty = room.specialtyId;
  const specialtyId =
    specialty && typeof specialty === "object" && specialty._id
      ? specialty
      : specialty
        ? { _id: specialty, name: "", code: "" }
        : null;

  return {
    _id: room._id.toString(),
    roomCode: room.roomCode || "",
    roomNumber: room.roomNumber || "",
    name: room.name,
    floor: room.floor || "",
    capacity: room.capacity ?? 1,
    equipmentNotes: room.equipmentNotes || "",
    isActive: room.isActive,
    status: room.status || "active",
    specialtyId,
    department: room.departmentId
      ? {
          _id: room.departmentId._id?.toString() || room.departmentId.toString(),
          name: room.departmentId.name || "",
          location: room.departmentId.location || "",
        }
      : null,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
  };
}

function roomQuery() {
  return ClinicRoom.find()
    .populate("departmentId", "name location")
    .populate("specialtyId", "name code");
}

export async function listClinicRooms({ q, departmentId, isActive, page = 1, limit = 20 } = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10) || 20));

  const filter = {};

  if (isActive === "true") filter.isActive = true;
  if (isActive === "false") filter.isActive = false;

  if (departmentId && mongoose.Types.ObjectId.isValid(departmentId)) {
    filter.departmentId = new mongoose.Types.ObjectId(departmentId);
  }

  const search = (q || "").trim();
  if (search) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [
      { roomCode: regex },
      { roomNumber: regex },
      { name: regex },
      { floor: regex },
      { equipmentNotes: regex },
    ];
  }

  const skip = (pageNum - 1) * limitNum;

  const [items, total] = await Promise.all([
    roomQuery()
      .find(filter)
      .sort({ roomNumber: 1, roomCode: 1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    ClinicRoom.countDocuments(filter),
  ]);

  return {
    items: items.map((room) => serializeClinicRoom(room)),
    page: pageNum,
    limit: limitNum,
    total,
    totalPages: Math.ceil(total / limitNum) || 1,
  };
}

export async function listDepartmentOptions() {
  const items = await Department.find({ isActive: true }).sort({ name: 1 }).select("name location").lean();
  return items.map((d) => ({
    _id: d._id.toString(),
    name: d.name,
    location: d.location || "",
  }));
}

async function createDepartmentClinicRoom({
  departmentId,
  roomCode,
  name,
  floor,
  capacity,
  equipmentNotes,
  isActive,
}) {
  if (!departmentId || !mongoose.Types.ObjectId.isValid(departmentId)) {
    return { status: 400, body: { message: "Valid department is required" } };
  }

  const roomCodeVal = roomCode?.trim().toUpperCase();
  if (!roomCodeVal) return { status: 400, body: { message: "Room code is required" } };
  if (!/^[A-Z0-9_-]{2,12}$/.test(roomCodeVal)) {
    return {
      status: 400,
      body: { message: "Room code must be 2–12 characters (letters, numbers, hyphen, underscore)" },
    };
  }

  const nameVal = name?.trim();
  if (!nameVal) return { status: 400, body: { message: "Room name is required" } };
  if (nameVal.length > 100) {
    return { status: 400, body: { message: "Room name must be at most 100 characters" } };
  }

  const floorVal = floor?.trim() || "";
  if (floorVal.length > 20) {
    return { status: 400, body: { message: "Floor must be at most 20 characters" } };
  }

  const equipmentVal = equipmentNotes?.trim() || "";
  if (equipmentVal.length > 500) {
    return { status: 400, body: { message: "Equipment notes must be at most 500 characters" } };
  }

  const capacityNum = parseInt(capacity, 10);
  if (!capacityNum || capacityNum < 1 || capacityNum > 50) {
    return { status: 400, body: { message: "Capacity must be between 1 and 50" } };
  }

  const department = await Department.findById(departmentId);
  if (!department || !department.isActive) {
    return { status: 400, body: { message: "Department not found or inactive" } };
  }

  const codeExists = await ClinicRoom.findOne({ roomCode: roomCodeVal });
  if (codeExists) return { status: 409, body: { message: "Room code already exists" } };

  const room = await ClinicRoom.create({
    departmentId,
    roomCode: roomCodeVal,
    name: nameVal,
    floor: floorVal,
    capacity: capacityNum,
    equipmentNotes: equipmentVal,
    isActive: isActive !== false && isActive !== "false",
  });

  const populated = await roomQuery().findById(room._id).lean();

  return {
    status: 201,
    body: {
      message: "Clinic room created successfully",
      clinicRoom: serializeClinicRoom(populated),
      room: serializeClinicRoom(populated),
    },
  };
}

async function createSpecialtyClinicRoom({ roomNumber, name, specialtyId, status }) {
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
    isActive: status !== "inactive",
  });

  const populated = await roomQuery().findById(room._id).lean();

  return {
    status: 201,
    body: {
      message: "Clinic room created successfully",
      room: serializeClinicRoom(populated),
    },
  };
}

export async function createClinicRoom(payload) {
  if (payload.roomNumber || payload.specialtyId) {
    return createSpecialtyClinicRoom(payload);
  }
  return createDepartmentClinicRoom(payload);
}

export async function updateClinicRoom(roomId, { roomNumber, name, specialtyId, status, departmentId, roomCode, floor, capacity, equipmentNotes, isActive }) {
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

  if (roomCode?.trim()) {
    const cleanCode = roomCode.trim().toUpperCase();
    if (cleanCode !== room.roomCode) {
      const codeExists = await ClinicRoom.findOne({ roomCode: cleanCode });
      if (codeExists) {
        return { status: 409, body: { message: "Room code already exists" } };
      }
      room.roomCode = cleanCode;
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

  if (departmentId) {
    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      return { status: 400, body: { message: "Invalid department ID" } };
    }
    const departmentExists = await Department.findById(departmentId);
    if (!departmentExists) {
      return { status: 400, body: { message: "Department does not exist" } };
    }
    room.departmentId = departmentId;
  }

  if (status) room.status = status;
  if (floor !== undefined) room.floor = floor?.trim() || "";
  if (capacity !== undefined) {
    const capacityNum = parseInt(capacity, 10);
    if (!capacityNum || capacityNum < 1 || capacityNum > 50) {
      return { status: 400, body: { message: "Capacity must be between 1 and 50" } };
    }
    room.capacity = capacityNum;
  }
  if (equipmentNotes !== undefined) room.equipmentNotes = equipmentNotes?.trim() || "";
  if (isActive !== undefined) room.isActive = isActive !== false && isActive !== "false";

  await room.save();

  const populated = await roomQuery().findById(room._id).lean();

  return {
    status: 200,
    body: {
      message: "Clinic room updated successfully",
      room: serializeClinicRoom(populated),
    },
  };
}
