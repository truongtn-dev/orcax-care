import * as PatientAppointmentService from "../services/patientAppointment.service.js";

export async function listAppointments(req, res) {
  try {
    const result = await PatientAppointmentService.listAppointments(req.user.userId, req.query);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function getAppointment(req, res) {
  try {
    const result = await PatientAppointmentService.getAppointment(req.user.userId, req.params.id);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function rescheduleAppointment(req, res) {
  try {
    const result = await PatientAppointmentService.rescheduleAppointment(
      req.user.userId,
      req.params.id,
      req.body
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}
