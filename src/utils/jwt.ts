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

// "Remember this device" after a sign-in code: lets the same browser skip the code for 1 day.
// The password is still checked. Old tokens stop working when tokenVersion changes
// (sign out of all devices, password reset). It has no session id, so it can't be used as a login token.
const DEVICE_PURPOSE = "trusted-device";
export const TRUSTED_DEVICE_DAYS = 1;

export function signDeviceToken(userId: string, tokenVersion: number): string {
  return jwt.sign({ userId, tv: tokenVersion, purpose: DEVICE_PURPOSE }, env.JWT_SECRET, {
    expiresIn: `${TRUSTED_DEVICE_DAYS}d`,
  });
}

export function verifyDeviceToken(token: string): { userId: string; tokenVersion: number } | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (typeof decoded !== "object" || decoded.purpose !== DEVICE_PURPOSE || typeof decoded.userId !== "string") return null;
    return { userId: decoded.userId, tokenVersion: typeof decoded.tv === "number" ? decoded.tv : 0 };
  } catch {
    return null;
  }
}
