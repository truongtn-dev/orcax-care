import * as DoctorSearchService from "../services/doctorSearch.service.js";

export async function listSpecialties(req, res) {
  try {
    const items = await DoctorSearchService.listSpecialties();
    return res.json({ items });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function listDepartments(req, res) {
  try {
    const items = await DoctorSearchService.listDepartments();
    return res.json({ items });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function searchDoctors(req, res) {
  try {
    const { name, specialtyId, departmentId, page, limit } = req.query;
    const result = await DoctorSearchService.searchDoctors({
      name,
      specialtyId,
      departmentId,
      page,
      limit,
    });
    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
