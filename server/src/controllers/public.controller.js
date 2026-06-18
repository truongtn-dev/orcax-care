import * as DoctorSearchService from "../services/doctorSearch.service.js";
import * as DoctorAvailabilityService from "../services/doctorAvailability.service.js";

export async function listSpecialties(req, res) {
  try {
    const items = await DoctorSearchService.listSpecialties();
    return res.json({ items });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function listDepartments(req, res) {
  try {
    const items = await DoctorSearchService.listDepartments();
    return res.json({ items });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function getDoctorAvailability(req, res) {
  try {
    const result = await DoctorAvailabilityService.getDoctorAvailability(req.params.id, req.query);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function getDoctor(req, res) {
  try {
    const doctor = await DoctorSearchService.getDoctorBySlugOrId(req.params.id);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }
    return res.json(doctor);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function listFeaturedDoctors(req, res) {
  try {
    const { limit } = req.query;
    const items = await DoctorSearchService.getFeaturedDoctors(limit);
    return res.json({ items });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function searchDoctors(req, res) {
  try {
    const { q, name, specialtyId, departmentId, page, limit } = req.query;
    const result = await DoctorSearchService.searchDoctors({
      q,
      name,
      specialtyId,
      departmentId,
      page,
      limit,
    });
    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}
