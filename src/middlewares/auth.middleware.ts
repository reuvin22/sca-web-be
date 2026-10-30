import type { Request, RequestHandler } from "express";
import { isSessionActive } from "../modules/auth/auth.session";
import { ApiError } from "../utils/apiError";
import { verifyAccessToken, type TokenPayload } from "../utils/jwt";

// Requires "Authorization: Bearer <token>" for a session that is still active
// (not signed out, not ended by "sign out of all devices"). Sets req.user for the controller.
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const payload = token ? verifyAccessToken(token) : null;

  if (!payload || !(await isSessionActive(payload))) return next(new ApiError(401, "Please sign in to continue"));

  req.user = { id: payload.userId, session: payload };
  next();
};

// For controllers behind requireAuth (accepts any typed Request)
export function getUserId(req: Pick<Request, "user">): string {
  if (!req.user) throw new ApiError(401, "Please sign in to continue");
  return req.user.id;
}

// The signed-in session (for signing out)
export function getSession(req: Pick<Request, "user">): TokenPayload {
  if (!req.user) throw new ApiError(401, "Please sign in to continue");
  return req.user.session;
}
