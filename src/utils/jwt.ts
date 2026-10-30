import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

export interface TokenPayload {
  userId: string;
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"] });
}

// Returns the payload, or null when the token is invalid or expired.
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    return typeof decoded === "object" && typeof decoded.userId === "string" ? { userId: decoded.userId } : null;
  } catch {
    return null;
  }
}
