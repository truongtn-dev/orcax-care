import crypto from "crypto";
import { AuthToken } from "../models/AuthToken.js";
import { generateToken } from "../utils/validation.js";

const SESSION_MS = 8 * 60 * 60 * 1000;
const REMEMBER_ME_MS = 30 * 24 * 60 * 60 * 1000;

export function hashAuthToken(plainToken) {
  return crypto.createHash("sha256").update(plainToken).digest("hex");
}

export async function issueAuthToken(userId, rememberMe = false) {
  const plainToken = generateToken();
  const tokenHash = hashAuthToken(plainToken);
  const ttl = rememberMe ? REMEMBER_ME_MS : SESSION_MS;

  await AuthToken.create({
    userId,
    tokenHash,
    expiresAt: new Date(Date.now() + ttl),
    rememberMe,
  });

  return {
    plainToken,
    tokenType: "Token",
    expiresInMs: ttl,
  };
}

export async function findValidAuthToken(plainToken) {
  if (!plainToken) return null;

  const tokenHash = hashAuthToken(plainToken);
  const doc = await AuthToken.findOne({
    tokenHash,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!doc) return null;

  doc.lastUsedAt = new Date();
  await doc.save();

  return doc;
}

export async function revokeAuthToken(plainToken) {
  if (!plainToken) return;
  const tokenHash = hashAuthToken(plainToken);
  await AuthToken.updateOne(
    { tokenHash, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
}

export async function revokeAllUserTokens(userId) {
  await AuthToken.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
}

export { SESSION_MS, REMEMBER_ME_MS };
