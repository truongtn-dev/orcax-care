import { isDatabaseConnected } from "../config/database.js";

export function requireDatabase(req, res, next) {
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      message:
        "Database not connected. Fix MONGODB_URI in server/.env (Atlas IP whitelist or local MongoDB).",
    });
  }
  next();
}
