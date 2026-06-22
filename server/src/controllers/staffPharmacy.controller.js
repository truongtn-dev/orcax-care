import * as StaffPharmacyService from "../services/staffPharmacy.service.js";

export async function getPharmacyDashboard(req, res) {
  try {
    const result = await StaffPharmacyService.getPharmacyDashboard();
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function getStaffDashboard(req, res) {
  try {
    const result = await StaffPharmacyService.getStaffDashboard();
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function listMedicines(req, res) {
  try {
    const result = await StaffPharmacyService.listMedicines(req.query);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function listStockMovements(req, res) {
  try {
    const result = await StaffPharmacyService.listStockMovements(req.query);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function stockInbound(req, res) {
  try {
    const result = await StaffPharmacyService.stockInbound(req.user.userId, req.body);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}
