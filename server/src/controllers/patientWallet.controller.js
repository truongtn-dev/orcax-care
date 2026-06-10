import * as PatientWalletService from "../services/patientWallet.service.js";

export async function getWallet(req, res) {
  try {
    const result = await PatientWalletService.getPatientWallet(req.user.userId, req.query);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function createPayosTopup(req, res) {
  try {
    const result = await PatientWalletService.createPayosTopup(req.user.userId, req.body, req);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function createMomoTopup(req, res) {
  try {
    const result = await PatientWalletService.createMomoTopup(req.user.userId, req.body, req);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function confirmMockPayosTopup(req, res) {
  try {
    const result = await PatientWalletService.confirmMockPayosTopup(req.user.userId, req.body);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function confirmMockMomoTopup(req, res) {
  try {
    const result = await PatientWalletService.confirmMockMomoTopup(req.user.userId, req.body);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function deductWallet(req, res) {
  try {
    const result = await PatientWalletService.deductPatientWallet(req.user.userId, req.body);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function getTopupReceipt(req, res) {
  try {
    const result = await PatientWalletService.getTopupReceipt(
      req.user.userId,
      req.params.orderCode
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}
