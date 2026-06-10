import mongoose from "mongoose";
import { ClinicRoom } from "../models/ClinicRoom.js";
import { Doctor } from "../models/Doctor.js";
import { WorkShift } from "../models/WorkShift.js";
import {
  DAY_OF_WEEK_LABELS,
  computeSlotDurationMin,
  doTimeRangesOverlap,
  isValidTimeString,
  timeToMinutes,
} from "../utils/shiftTime.js";

function serializeWorkShift(shift) {
  const doctor = shift.doctorId;
  const room = shift.roomId;

  return {
    _id: shift._id.toString(),
    doctorId: doctor?._id?.toString() || shift.doctorId?.toString(),
    doctorName: doctor?.userId?.fullName || "",
    roomId: room?._id?.toString() || shift.roomId?.toString() || null,
    roomName: room?.name || "",
    dayOfWeek: shift.dayOfWeek,
    dayLabel: DAY_OF_WEEK_LABELS[shift.dayOfWeek] || "",
    startTime: shift.startTime,
    endTime: shift.endTime,
    maxPatients: shift.maxPatients,
    slotDurationMin: shift.slotDurationMin,
    isActive: shift.isActive,
    createdAt: shift.createdAt,
    updatedAt: shift.updatedAt,
  };
}

function shiftQuery() {
  return WorkShift.find()
    .populate({ path: "doctorId", populate: { path: "userId", select: "fullName isActive" } })
    .populate("roomId", "name roomNumber roomCode");
}

async function findOverlappingShift({ doctorId, dayOfWeek, startTime, endTime, excludeId }) {
  const filter = {
    doctorId,
    dayOfWeek,
    isActive: true,
  };
  if (excludeId) {
    filter._id = { $ne: excludeId };
  }

  const existing = await WorkShift.find(filter).lean();
  return existing.find((shift) => doTimeRangesOverlap(startTime, endTime, shift.startTime, shift.endTime));
}

export async function createWorkShift(payload) {
  const {
    doctorId,
    roomId,
    dayOfWeek,
    startTime,
    endTime,
    maxPatients,
    slotDurationMin,
    isActive = true,
  } = payload;

  if (!doctorId || !mongoose.Types.ObjectId.isValid(doctorId)) {
    return { status: 400, body: { message: "Bác sĩ không hợp lệ" } };
  }

  const day = Number(dayOfWeek);
  if (!Number.isInteger(day) || day < 0 || day > 6) {
    return { status: 400, body: { message: "Ngày trong tuần phải từ 0 (CN) đến 6 (T7)" } };
  }

  const start = (startTime || "").trim();
  const end = (endTime || "").trim();
  if (!isValidTimeString(start) || !isValidTimeString(end)) {
    return { status: 400, body: { message: "Giờ bắt đầu/kết thúc phải theo định dạng HH:mm" } };
  }
  if (timeToMinutes(end) <= timeToMinutes(start)) {
    return { status: 400, body: { message: "Giờ kết thúc phải sau giờ bắt đầu" } };
  }

  const capacity = parseInt(maxPatients, 10);
  if (!capacity || capacity < 1) {
    return { status: 400, body: { message: "Số bệnh nhân tối đa phải >= 1" } };
  }

  const doctor = await Doctor.findById(doctorId).populate("userId", "fullName isActive");
  if (!doctor || !doctor.isActive) {
    return { status: 404, body: { message: "Không tìm thấy bác sĩ đang hoạt động" } };
  }
  if (!doctor.userId?.isActive) {
    return { status: 400, body: { message: "Tài khoản bác sĩ chưa được kích hoạt" } };
  }

  let roomObjectId = null;
  if (roomId) {
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return { status: 400, body: { message: "Phòng khám không hợp lệ" } };
    }
    const room = await ClinicRoom.findById(roomId);
    if (!room || !room.isActive) {
      return { status: 404, body: { message: "Không tìm thấy phòng khám đang hoạt động" } };
    }
    roomObjectId = room._id;
  }

  const overlap = await findOverlappingShift({
    doctorId: doctor._id,
    dayOfWeek: day,
    startTime: start,
    endTime: end,
  });
  if (overlap) {
    return {
      status: 409,
      body: {
        message: "Ca làm trùng với ca hiện có của bác sĩ trong cùng ngày",
        conflict: {
          shiftId: overlap._id.toString(),
          startTime: overlap.startTime,
          endTime: overlap.endTime,
        },
      },
    };
  }

  const duration =
    slotDurationMin != null && slotDurationMin !== ""
      ? parseInt(slotDurationMin, 10)
      : computeSlotDurationMin(start, end, capacity);

  if (!duration || duration < 15) {
    return { status: 400, body: { message: "Thời lượng mỗi slot phải >= 15 phút" } };
  }

  const shift = await WorkShift.create({
    doctorId: doctor._id,
    roomId: roomObjectId,
    dayOfWeek: day,
    startTime: start,
    endTime: end,
    maxPatients: capacity,
    slotDurationMin: duration,
    isActive: isActive !== false,
  });

  const populated = await shiftQuery().findById(shift._id).lean();
  return { status: 201, body: serializeWorkShift(populated) };
}
