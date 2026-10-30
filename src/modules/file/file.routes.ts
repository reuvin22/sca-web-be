import { Router } from "express";
import { uploadLimiter } from "../../middlewares/rateLimit.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { idParamsSchema } from "../../utils/schema";
import * as fileController from "./file.controller";
import { uploadSingleFile } from "./file.upload";
import { fileQuerySchema } from "./file.validator";

const router = Router();

router.get("/", validate({ query: fileQuerySchema }), fileController.listFiles);
// multipart/form-data with one field named "file"
router.post("/", uploadLimiter, uploadSingleFile, fileController.uploadFile);
router.get("/:id/download", validate({ params: idParamsSchema }), fileController.downloadFile);
router.delete("/:id", validate({ params: idParamsSchema }), fileController.deleteFile);

export default router;
