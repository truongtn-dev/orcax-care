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
