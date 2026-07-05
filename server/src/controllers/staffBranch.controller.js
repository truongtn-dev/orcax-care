import * as StaffBranchService from "../services/staffBranch.service.js";

function sendResult(res, result) {
  return res.status(result.status).json(result.body);
}

export async function getMyBranch(req, res) {
  try {
    const result = await StaffBranchService.getManagedBranch(req.user.userId);
    return sendResult(res, result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function updateMyBranch(req, res) {
  try {
    const result = await StaffBranchService.updateManagedBranchOperations(req.user.userId, req.body);
    return sendResult(res, result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}
