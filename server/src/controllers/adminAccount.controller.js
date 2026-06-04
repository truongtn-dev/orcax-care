import * as AdminAccountService from "../services/adminAccount.service.js";

function sendResult(res, result) {
  return res.status(result.status).json(result.body);
}

export async function listAccounts(req, res) {
  try {
    const result = await AdminAccountService.listAccounts(req.query);
    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function createAccount(req, res) {
  try {
    return sendResult(res, await AdminAccountService.createAccount(req.body));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
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
