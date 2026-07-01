import * as QueueSessionService from "../services/queueSession.service.js";

export async function listDoctorRooms(req, res) {
  try {
    const result = await QueueSessionService.listDoctorRooms(req.user.userId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function getDoctorActiveSession(req, res) {
  try {
    const result = await QueueSessionService.getDoctorActiveSession(req.user.userId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function openSession(req, res) {
  try {
    const result = await QueueSessionService.openSession(req.user.userId, req.body);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function getSession(req, res) {
  try {
    const result = await QueueSessionService.getSessionById(req.user.userId, req.params.id, req.user.role);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function callNext(req, res) {
  try {
    const result = await QueueSessionService.callNextTicket(req.user.userId, req.params.id);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function recallTicket(req, res) {
  try {
    const result = await QueueSessionService.recallLastSkipped(req.user.userId, req.params.id);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function markSkipped(req, res) {
  try {
    const result = await QueueSessionService.markTicketSkipped(req.user.userId, req.params.id, req.params.ticketId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function pauseSession(req, res) {
  try {
    const result = await QueueSessionService.pauseSession(req.user.userId, req.params.id);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function resumeSession(req, res) {
  try {
    const result = await QueueSessionService.resumeSession(req.user.userId, req.params.id);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function closeSession(req, res) {
  try {
    const result = await QueueSessionService.closeSession(req.user.userId, req.params.id);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function getMyQueueStatus(req, res) {
  try {
    const result = await QueueSessionService.getPatientQueueStatus(req.user.userId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function getQueueBoard(req, res) {
  try {
    const result = await QueueSessionService.getQueueBoard(req.params.roomId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}
