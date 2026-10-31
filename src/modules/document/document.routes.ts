import { Router } from "express";
import { documentLimiter } from "../../middlewares/rateLimit.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { idParamsSchema } from "../../utils/schema";
import * as documentController from "./document.controller";
import { uploadDocument } from "./document.upload";
import { documentQuerySchema } from "./document.validator";

// Document Storage (PDF editor). Create / update: multipart with "project" (JSON) and, on create, "source" (PDF).
const router = Router();

router.get("/", validate({ query: documentQuerySchema }), documentController.listDocuments);
router.get("/:id", validate({ params: idParamsSchema }), documentController.getDocument);
router.get("/:id/source", validate({ params: idParamsSchema }), documentController.getSource);
router.post("/", documentLimiter, uploadDocument, documentController.createDocument);
router.put(
  "/:id",
  documentLimiter,
  validate({ params: idParamsSchema }),
  uploadDocument,
  documentController.updateDocument,
);
router.delete("/:id", validate({ params: idParamsSchema }), documentController.deleteDocument);

export default router;
