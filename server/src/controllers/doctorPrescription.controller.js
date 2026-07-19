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

export async function getPrescription(req, res) {
  try {
    const result = await DoctorPrescriptionService.getDoctorPrescription(
      req.user.userId,
      req.params.id
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function addLineItem(req, res) {
  try {
    const result = await DoctorPrescriptionService.addLineItem(
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

export async function updateLineItem(req, res) {
  try {
    const result = await DoctorPrescriptionService.updateLineItem(
      req.user.userId,
      req.params.id,
      req.params.itemId,
      req.body
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function removeLineItem(req, res) {
  try {
    const result = await DoctorPrescriptionService.removeLineItem(
      req.user.userId,
      req.params.id,
      req.params.itemId
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function listDoctorPrescriptions(req, res) {
  try {
    const result = await DoctorPrescriptionService.listDoctorPrescriptions(req.user.userId, req.query);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}
