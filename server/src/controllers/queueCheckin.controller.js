import * as QueueCheckinService from "../services/queueCheckin.service.js";

export async function searchCheckinAppointments(req, res) {
  try {
    const result = await QueueCheckinService.searchTodayAppointments(req.query.q);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function issueTicket(req, res) {
  try {
    const result = await QueueCheckinService.issueQueueTicket(req.user.userId, req.params.appointmentId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}
