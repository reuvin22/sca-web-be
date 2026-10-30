import type { RequestHandler } from "express";
import type { UserDoc } from "../modules/profile/profile.types";
import { ApiError } from "../utils/apiError";
import { usersCollection } from "../utils/firestore";
import { roleOf, type AccessRole } from "../utils/roles";
import { getUserId } from "./auth.middleware";

// Only lets users with one of these roles through (403 otherwise). Use after requireAuth.
// The role is read from the database on each request, so a role change works right away.
export function requireRole(...roles: AccessRole[]): RequestHandler {
  return async (req, _res, next) => {
    const doc = await usersCollection.doc(getUserId(req)).get();
    const user = doc.data() as UserDoc | undefined;
    if (!user || !roles.includes(roleOf(user))) {
      return next(new ApiError(403, "You don't have access to this page"));
    }
    next();
  };
}
