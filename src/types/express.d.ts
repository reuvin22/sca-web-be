import type { TokenPayload } from "../utils/jwt";

// Adds req.user, set by the requireAuth middleware.
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; session: TokenPayload };
    }
  }
}

export {};
