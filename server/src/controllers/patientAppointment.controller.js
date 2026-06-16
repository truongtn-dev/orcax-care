import * as PatientAppointmentService from "../services/patientAppointment.service.js";

function sendResult(res, result) {
  return res.status(result.status).json(result.body);
}

export async function createAppointment(req, res) {
  try {
    return sendResult(res, await PatientAppointmentService.createAppointment(req.user.userId, req.body));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function listAppointments(req, res) {
  try {
    return sendResult(res, await PatientAppointmentService.listAppointments(req.user.userId, req.query));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function getAppointment(req, res) {
  try {
    return sendResult(res, await PatientAppointmentService.getAppointment(req.user.userId, req.params.id));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function rescheduleAppointment(req, res) {
  try {
    return sendResult(
      res,
      await PatientAppointmentService.rescheduleAppointment(req.user.userId, req.params.id, req.body)
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function cancelAppointment(req, res) {
  try {
    return sendResult(
      res,
      await PatientAppointmentService.cancelAppointment(req.user.userId, req.params.id, req.body)
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function rateAppointment(req, res) {
  try {
    return sendResult(
      res,
      await PatientAppointmentService.rateAppointment(req.user.userId, req.params.id, req.body)
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}
