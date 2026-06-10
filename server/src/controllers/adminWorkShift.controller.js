import * as AdminWorkShiftService from "../services/adminWorkShift.service.js";

function sendResult(res, result) {
  return res.status(result.status).json(result.body);
}

export async function createWorkShift(req, res) {
  try {
    return sendResult(res, await AdminWorkShiftService.createWorkShift(req.body));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function listWorkShifts(req, res) {
  try {
    const data = await AdminWorkShiftService.listWorkShifts(req.query);
    return res.status(200).json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function getWorkShift(req, res) {
  try {
    return sendResult(res, await AdminWorkShiftService.getWorkShiftById(req.params.id));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function updateWorkShift(req, res) {
  try {
    return sendResult(res, await AdminWorkShiftService.updateWorkShift(req.params.id, req.body));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function deleteWorkShift(req, res) {
  try {
    return sendResult(res, await AdminWorkShiftService.deleteWorkShift(req.params.id));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}
