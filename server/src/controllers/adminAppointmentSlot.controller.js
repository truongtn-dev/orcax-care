import * as AdminAppointmentSlotService from "../services/adminAppointmentSlot.service.js";

function sendResult(res, result) {
  return res.status(result.status).json(result.body);
}

export async function generateAppointmentSlots(req, res) {
  try {
    return sendResult(res, await AdminAppointmentSlotService.generateAppointmentSlots(req.body));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function previewAppointmentSlots(req, res) {
  try {
    return sendResult(res, await AdminAppointmentSlotService.previewAppointmentSlots(req.body));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}
