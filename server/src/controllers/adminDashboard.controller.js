import * as AdminDashboardService from "../services/adminDashboard.service.js";

export async function getDashboard(req, res) {
  try {
    const result = await AdminDashboardService.getDashboardSummary(req.query);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}
