import { Router } from "express";
import { validate } from "../../middlewares/validate.middleware";
import * as profileController from "./profile.controller";
import { uploadProfilePhoto } from "./profile.photo";
import { updateProfileSchema } from "./profile.validator";

const router = Router();

router.get("/", profileController.getProfile);
router.put("/", validate({ body: updateProfileSchema }), profileController.updateProfile);

// Profile picture: multipart/form-data field "photo" (PNG, JPG or WEBP, max 10 MB)
router.get("/photo", profileController.getPhoto);
router.post("/photo", uploadProfilePhoto, profileController.uploadPhoto);
router.delete("/photo", profileController.deletePhoto);

export default router;
