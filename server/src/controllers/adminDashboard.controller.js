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

export async function exportRevenue(req, res) {
  try {
    const result = await AdminDashboardService.exportRevenueReport(req.query);
    if (result.status !== 200) {
      return res.status(result.status).json(result.body || { message: "Export failed" });
    }
    res.setHeader("Content-Type", result.contentType);
    res.setHeader("Content-Disposition", result.contentDisposition);
    return res.send(result.buffer);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}
