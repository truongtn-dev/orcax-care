import * as AdminWorkShiftService from "../services/adminWorkShift.service.js";

function sendResult(res, result) {
  return res.status(result.status).json(result.body);
}

export async function createWorkShift(req, res) {
  try {
    return sendResult(res, await AdminWorkShiftService.createWorkShift(req.body));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
}
