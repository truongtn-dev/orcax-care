import * as PatientEmrService from "../services/patientEmr.service.js";

export async function listTimeline(req, res) {
  try {
    const result = await PatientEmrService.listTimeline(req.user.userId, req.query);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}
