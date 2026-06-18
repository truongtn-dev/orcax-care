import * as PatientInsuranceCardService from "../services/patientInsuranceCard.service.js";

export async function listInsuranceCards(req, res) {
  try {
    const result = await PatientInsuranceCardService.listInsuranceCards(req.user.userId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function createInsuranceCard(req, res) {
  try {
    const result = await PatientInsuranceCardService.createInsuranceCard(
      req.user.userId,
      req.body
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function updateInsuranceCard(req, res) {
  try {
    const result = await PatientInsuranceCardService.updateInsuranceCard(
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

export async function deleteInsuranceCard(req, res) {
  try {
    const result = await PatientInsuranceCardService.deleteInsuranceCard(
      req.user.userId,
      req.params.id
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function extractInsuranceCardOcr(req, res) {
  try {
    const result = await PatientInsuranceCardService.extractInsuranceCardOcr(req.body);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}
