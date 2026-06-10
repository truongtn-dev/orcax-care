import * as DoctorWorkShiftService from "../services/doctorWorkShift.service.js";

export async function listMyWorkShifts(req, res) {
  try {
    const result = await DoctorWorkShiftService.listMyWorkShifts(req.user.userId, req.query);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}
