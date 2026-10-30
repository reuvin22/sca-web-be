import { Router } from "express";
import { uploadLimiter } from "../../middlewares/rateLimit.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { paginationQuerySchema } from "../../utils/pagination";
import * as auditController from "../audit/audit.controller";
import * as profileController from "./profile.controller";
import { uploadProfilePhoto } from "./profile.photo";
import { updateProfileSchema } from "./profile.validator";

const router = Router();

router.get("/", profileController.getProfile);
router.put("/", validate({ body: updateProfileSchema }), profileController.updateProfile);

// Profile picture: multipart/form-data field "photo" (PNG, JPG or WEBP, max 10 MB)
router.get("/photo", profileController.getPhoto);
router.post("/photo", uploadLimiter, uploadProfilePhoto, profileController.uploadPhoto);
router.delete("/photo", profileController.deletePhoto);

// Your own activity log: sign-ins, sign-outs, changes and downloads (newest first)
router.get("/activity", validate({ query: paginationQuerySchema }), auditController.listActivity);

export default router;
