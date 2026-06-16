import * as PatientFavoriteDoctorService from "../services/patientFavoriteDoctor.service.js";

export async function listFavoriteDoctors(req, res) {
  try {
    const result = await PatientFavoriteDoctorService.listFavoriteDoctors(req.user.userId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function addFavoriteDoctor(req, res) {
  try {
    const result = await PatientFavoriteDoctorService.addFavoriteDoctor(
      req.user.userId,
      req.params.doctorId
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function removeFavoriteDoctor(req, res) {
  try {
    const result = await PatientFavoriteDoctorService.removeFavoriteDoctor(
      req.user.userId,
      req.params.doctorId
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}
