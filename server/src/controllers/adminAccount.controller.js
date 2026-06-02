import * as AdminAccountService from "../services/adminAccount.service.js";

function sendResult(res, result) {
  return res.status(result.status).json(result.body);
}

export async function getAccount(req, res) {
  try {
    return sendResult(res, await AdminAccountService.getAccount(req.params.id));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
}

export async function updateAccount(req, res) {
  try {
    return sendResult(res, await AdminAccountService.updateAccount(req.params.id, req.body));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
}
