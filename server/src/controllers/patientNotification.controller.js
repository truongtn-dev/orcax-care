import * as PatientNotificationService from "../services/patientNotification.service.js";

export async function listNotifications(req, res) {
  try {
    const result = await PatientNotificationService.listNotifications(req.user.userId, req.query);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function markNotificationRead(req, res) {
  try {
    const result = await PatientNotificationService.markNotificationRead(
      req.user.userId,
      req.params.id
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}
