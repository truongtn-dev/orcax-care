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
    return res.status(401).json({ message: "Chưa xác thực" });
  }

  const tokenDoc = await findValidAuthToken(plainToken);
  if (!tokenDoc) {
    return res.status(401).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
  }

  const user = await User.findById(tokenDoc.userId).select(
    "email role isActive isLocked isEmailVerified passwordChangedAt"
  );

  if (!user) {
    return res.status(401).json({ message: "Chưa xác thực" });
  }

  if (user.isLocked) {
    return res.status(403).json({ message: "Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ." });
  }

  if (!user.isActive) {
    return res.status(403).json({ message: "Tài khoản chưa kích hoạt." });
  }

  if (user.role === "patient" && !user.isEmailVerified) {
    return res.status(403).json({ message: "Yêu cầu xác minh email" });
  }

  if (user.passwordChangedAt && tokenDoc.createdAt < user.passwordChangedAt) {
    return res.status(401).json({ message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." });
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
      return res.status(403).json({ message: "Không có quyền truy cập" });
    }
    next();
  };
}
