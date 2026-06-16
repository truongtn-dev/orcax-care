import * as DoctorAppointmentService from "../services/doctorAppointment.service.js";

export async function listTodayAppointments(req, res) {
  try {
    const result = await DoctorAppointmentService.listTodayAppointments(
      req.user.userId,
      req.query
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function getAppointment(req, res) {
  try {
    const result = await DoctorAppointmentService.getAppointment(req.user.userId, req.params.id);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}
