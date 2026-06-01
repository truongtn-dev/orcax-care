import * as ProfileService from "../services/profile.service.js";

function sendResult(res, result) {
  return res.status(result.status).json(result.body);
}

export async function getProfile(req, res) {
  try {
    return sendResult(res, await ProfileService.getProfile(req.user.userId, req.user.role));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function updateProfile(req, res) {
  try {
    return sendResult(res, await ProfileService.updateProfile(req.user.userId, req.user.role, req.body));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
