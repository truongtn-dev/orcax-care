import * as DoctorPrescriptionService from "../services/doctorPrescription.service.js";

export async function listMedicines(req, res) {
  try {
    const result = await DoctorPrescriptionService.listMedicines(req.query);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function createPrescription(req, res) {
  try {
    const result = await DoctorPrescriptionService.createPrescription(
      req.user.userId,
      req.params.id,
      req.body
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}
