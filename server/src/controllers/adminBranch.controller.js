import * as AdminBranchService from "../services/adminBranch.service.js";

function sendResult(res, result) {
  return res.status(result.status).json(result.body);
}

export async function listBranches(req, res) {
  try {
    const result = await AdminBranchService.listBranchesAdmin(req.query);
    return sendResult(res, result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function getBranch(req, res) {
  try {
    const result = await AdminBranchService.getBranchAdmin(req.params.id);
    return sendResult(res, result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function createBranch(req, res) {
  try {
    const result = await AdminBranchService.createBranchAdmin(req.body);
    return sendResult(res, result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function updateBranch(req, res) {
  try {
    const result = await AdminBranchService.updateBranchAdmin(req.params.id, req.body);
    return sendResult(res, result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function listStaffOptions(req, res) {
  try {
    const result = await AdminBranchService.listBranchStaffOptions();
    return sendResult(res, result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}
