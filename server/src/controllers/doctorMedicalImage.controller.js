import * as DoctorMedicalImageService from "../services/doctorMedicalImage.service.js";

export async function deleteMedicalImage(req, res) {
  try {
    const result = await DoctorMedicalImageService.deleteMedicalImage(
      req.user.userId,
      req.params.id
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}
