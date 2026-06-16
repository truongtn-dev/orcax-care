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

export async function createSepayTopup(req, res) {
  try {
    const result = await PatientWalletService.createSepayTopup(req.user.userId, req.body, req);
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

export async function confirmMockSepayTopup(req, res) {
  try {
    const result = await PatientWalletService.confirmMockSepayTopup(req.user.userId, req.body);
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

export async function cancelTopup(req, res) {
  try {
    const result = await PatientWalletService.cancelTopup(
      req.user.userId,
      req.params.provider,
      req.params.ref
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function getTopupCheckout(req, res) {
  try {
    const result = await PatientWalletService.getTopupCheckout(
      req.user.userId,
      req.params.provider,
      req.params.ref
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function getTopupStatus(req, res) {
  try {
    const result = await PatientWalletService.getTopupStatus(
      req.user.userId,
      req.params.provider,
      req.params.ref
    );
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
