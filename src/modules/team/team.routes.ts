import { Router } from "express";
import { inviteLimiter } from "../../middlewares/rateLimit.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validate.middleware";
import * as teamController from "./team.controller";
import { inviteSchema } from "./team.validator";

// Developers only
const router = Router();
router.use(requireRole("dev"));

// Team members (assignable developers). Small list, so not paged.
router.get("/", teamController.listDevelopers);
router.post("/invitations", inviteLimiter, validate({ body: inviteSchema }), teamController.inviteDeveloper);

export default router;
