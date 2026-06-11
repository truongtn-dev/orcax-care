import { User } from "../models/User.js";
import { findValidAuthToken } from "../services/token.service.js";

export function parseAuthToken(header) {
  if (!header) return null;
  const [scheme, credentials] = header.split(" ");
  if (scheme === "Token" && credentials) return credentials.trim();
  return null;
}

export async function authMiddleware(req, res, next) {
  const plainToken = parseAuthToken(req.headers.authorization);
  if (!plainToken) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const tokenDoc = await findValidAuthToken(plainToken);
  if (!tokenDoc) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  const user = await User.findById(tokenDoc.userId).select(
    "email role isActive isLocked isEmailVerified passwordChangedAt"
  );

  if (!user) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  if (user.isLocked) {
    return res.status(403).json({ message: "Account is locked. Please contact support." });
  }

  if (!user.isActive) {
    return res.status(403).json({ message: "Account is not activated." });
  }

  if (user.role === "patient" && !user.isEmailVerified) {
    return res.status(403).json({ message: "Email verification required" });
  }

  if (user.passwordChangedAt && tokenDoc.createdAt < user.passwordChangedAt) {
    return res.status(401).json({ message: "Session expired. Please sign in again." });
  }

  req.user = {
    userId: user._id.toString(),
    role: user.role,
    email: user.email,
  };
  req.authToken = plainToken;
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
}
