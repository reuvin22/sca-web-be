import { Router } from "express";
import { validate } from "../../middlewares/validate.middleware";
import * as profileController from "./profile.controller";
import { updateProfileSchema } from "./profile.validator";

const router = Router();

router.get("/", profileController.getProfile);
router.put("/", validate({ body: updateProfileSchema }), profileController.updateProfile);

export default router;
