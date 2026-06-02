import * as AdminDoctorService from "../services/adminDoctor.service.js";

function sendResult(res, result) {
  return res.status(result.status).json(result.body);
}

export async function listDoctors(req, res) {
  try {
    return sendResult(res, await AdminDoctorService.listDoctors(req.query));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
}

export async function getDoctor(req, res) {
  try {
    return sendResult(res, await AdminDoctorService.getDoctor(req.params.id));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
}

export async function updateDoctor(req, res) {
  try {
    return sendResult(res, await AdminDoctorService.updateDoctor(req.params.id, req.body));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
}
