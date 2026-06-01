import * as AuthService from "../services/auth.service.js";

function sendResult(res, result) {
  return res.status(result.status).json(result.body);
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    return sendResult(res, await AuthService.login(email, password));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function register(req, res) {
  try {
    return sendResult(res, await AuthService.registerPatient(req.body));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function forgotPassword(req, res) {
  try {
    return sendResult(res, await AuthService.requestReset(req.body.email));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body;
    return sendResult(res, await AuthService.resetPassword(token, newPassword));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function verifyEmail(req, res) {
  try {
    return sendResult(res, await AuthService.verifyEmail(req.query.token));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function resendVerification(req, res) {
  try {
    return sendResult(res, await AuthService.resendVerification(req.body.email));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function changePassword(req, res) {
  try {
    return sendResult(
      res,
      await AuthService.changePassword(req.user.userId, req.body)
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function me(req, res) {
  return res.json({
    userId: req.user.userId,
    role: req.user.role,
    email: req.user.email,
  });
}
