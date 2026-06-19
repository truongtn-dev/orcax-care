import * as AdminSpecialtyService from "../services/adminSpecialty.service.js";

export async function listSpecialties(req, res) {
  try {
    const { q, isActive, page, limit } = req.query;
    const result = await AdminSpecialtyService.listSpecialties({ q, isActive, page, limit });
    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function createSpecialty(req, res) {
  try {
    const result = await AdminSpecialtyService.createSpecialty(req.body);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function deleteSpecialty(req, res) {
  try {
    const result = await AdminSpecialtyService.deleteSpecialty(req.params.id);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function getSpecialty(req, res) {
  try {
    const result = await AdminSpecialtyService.getSpecialty(req.params.id);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
