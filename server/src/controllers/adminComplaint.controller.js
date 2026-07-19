import * as AdminComplaintService from "../services/adminComplaint.service.js";

export async function listComplaints(req, res) {
  try {
    const result = await AdminComplaintService.listComplaints(req.query);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function getComplaint(req, res) {
  try {
    const result = await AdminComplaintService.getComplaintDetail(req.params.id);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function updateComplaintStatus(req, res) {
  try {
    const result = await AdminComplaintService.updateComplaintStatus(
      req.params.id,
      req.body.status,
      req.user.userId
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function replyToComplaint(req, res) {
  try {
    const result = await AdminComplaintService.replyToComplaint(
      req.params.id,
      req.user.userId,
      req.body.content
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}
