import type { Request, RequestHandler } from "express";
import { ApiError } from "../utils/apiError";
import { verifyAccessToken } from "../utils/jwt";

// Requires "Authorization: Bearer <token>". Sets req.user for the controller.
export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const payload = token ? verifyAccessToken(token) : null;

  if (!payload) return next(new ApiError(401, "Please sign in to continue"));

  req.user = { id: payload.userId };
  next();
};

// For controllers behind requireAuth (accepts any typed Request)
export function getUserId(req: Pick<Request, "user">): string {
  if (!req.user) throw new ApiError(401, "Please sign in to continue");
  return req.user.id;
}
