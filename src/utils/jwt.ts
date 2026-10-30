import crypto from "node:crypto";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

// Login token. `sessionId` lets one sign-in be revoked (sign out); `tokenVersion` must match the
// user's current version, so "sign out of all devices" and password resets end every older token.
export interface TokenPayload {
  userId: string;
  sessionId: string;
  tokenVersion: number;
  expiresAt: number; // milliseconds since 1970
}

export function signAccessToken(userId: string, tokenVersion: number): string {
  const payload = { userId, sid: crypto.randomUUID(), tv: tokenVersion };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"] });
}

// Returns the payload, or null when the token is invalid, expired, or from before sessions existed.
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (typeof decoded !== "object" || typeof decoded.userId !== "string" || typeof decoded.sid !== "string") return null;
    return {
      userId: decoded.userId,
      sessionId: decoded.sid,
      tokenVersion: typeof decoded.tv === "number" ? decoded.tv : 0,
      expiresAt: (decoded.exp ?? 0) * 1000,
    };
  } catch {
    return null;
  }
}
