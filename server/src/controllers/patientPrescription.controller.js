import * as DoctorPrescriptionService from "../services/doctorPrescription.service.js";

export async function getPrescription(req, res) {
  try {
    const result = await DoctorPrescriptionService.getPatientPrescription(
      req.user.userId,
      req.params.id
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}
