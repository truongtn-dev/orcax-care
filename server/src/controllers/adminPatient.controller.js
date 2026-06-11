import * as AdminPatientService from "../services/adminPatient.service.js";

function sendResult(res, result) {
  return res.status(result.status).json(result.body);
}

export async function listPatients(req, res) {
  try {
    return sendResult(res, await AdminPatientService.listPatients(req.query));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function getPatient(req, res) {
  try {
    return sendResult(res, await AdminPatientService.getPatient(req.params.id));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function updatePatient(req, res) {
  try {
    return sendResult(res, await AdminPatientService.updatePatient(req.params.id, req.body));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}
