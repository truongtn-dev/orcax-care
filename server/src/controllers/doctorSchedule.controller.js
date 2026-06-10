import * as DoctorScheduleService from "../services/doctorSchedule.service.js";

export async function getScheduleCalendar(req, res) {
  try {
    const result = await DoctorScheduleService.getScheduleCalendar(req.user.userId, req.query);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function getAppointmentSlotDetail(req, res) {
  try {
    const result = await DoctorScheduleService.getAppointmentSlotDetail(
      req.user.userId,
      req.params.id
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function blockAppointmentSlot(req, res) {
  try {
    const result = await DoctorScheduleService.blockAppointmentSlot(req.user.userId, req.params.id);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function unblockAppointmentSlot(req, res) {
  try {
    const result = await DoctorScheduleService.unblockAppointmentSlot(
      req.user.userId,
      req.params.id
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}
