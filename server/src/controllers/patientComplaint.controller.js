import * as PatientComplaintService from "../services/patientComplaint.service.js";

export async function listComplaints(req, res) {
  try {
    const result = await PatientComplaintService.listComplaints(req.user.userId, req.query);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function createComplaint(req, res) {
  try {
    const result = await PatientComplaintService.createComplaint(req.user.userId, req.body);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function getComplaint(req, res) {
  try {
    const result = await PatientComplaintService.getComplaintDetail(req.user.userId, req.params.id);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}
