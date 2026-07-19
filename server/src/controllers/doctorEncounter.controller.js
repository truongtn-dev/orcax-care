import * as DoctorEncounterService from "../services/doctorEncounter.service.js";

export async function getEncounter(req, res) {
  try {
    const result = await DoctorEncounterService.getEncounter(req.user.userId, req.params.id);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function signOffEncounter(req, res) {
  try {
    const result = await DoctorEncounterService.signOffEncounter(req.user.userId, req.params.id);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function updateEncounter(req, res) {
  try {
    const result = await DoctorEncounterService.updateEncounter(req.user.userId, req.params.id, req.body);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function createEncounter(req, res) {
  try {
    const result = await DoctorEncounterService.createEncounter(req.user.userId, req.params.id, req.body);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function searchIcd10(req, res) {
  try {
    const result = await DoctorEncounterService.searchIcd10(req.query);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function addDiagnosis(req, res) {
  try {
    const result = await DoctorEncounterService.addDiagnosis(req.user.userId, req.params.id, req.body);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function updateDiagnosis(req, res) {
  try {
    const result = await DoctorEncounterService.updateDiagnosis(
      req.user.userId,
      req.params.id,
      req.params.code,
      req.body
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function removeDiagnosis(req, res) {
  try {
    const result = await DoctorEncounterService.removeDiagnosis(req.user.userId, req.params.id, req.params.code);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function getPrescriptionByEncounterId(req, res) {
  try {
    const result = await DoctorEncounterService.getPrescriptionByEncounterId(req.user.userId, req.params.id);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}
