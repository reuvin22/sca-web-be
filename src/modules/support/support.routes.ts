import { Router } from "express";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { uploadMedia } from "../../utils/attachments";
import { idParamsSchema } from "../../utils/schema";
import * as supportController from "./support.controller";
import { attachmentParamsSchema, boardQuerySchema, supportRequestSchema, updateReportSchema } from "./support.validator";

const router = Router();

// Any signed-in user: multipart/form-data with type, subject, description, severity (bugs)
// and up to 6 "media" files (images/videos, bugs only)
router.post("/", uploadMedia, validate({ body: supportRequestSchema }), supportController.createSupportRequest);

// Developers only: the Reports Kanban board
const devOnly = requireRole("dev");
router.get("/board", devOnly, validate({ query: boardQuerySchema }), supportController.listBoard);
router.get("/:id", devOnly, validate({ params: idParamsSchema }), supportController.getReport);
router.patch("/:id", devOnly, validate({ params: idParamsSchema, body: updateReportSchema }), supportController.updateReport);
router.get(
  "/:id/attachments/:index",
  devOnly,
  validate({ params: attachmentParamsSchema }),
  supportController.getAttachment,
);

export default router;
