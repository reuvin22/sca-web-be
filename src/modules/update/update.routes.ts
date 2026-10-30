import { Router } from "express";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { uploadMedia } from "../../utils/attachments";
import { paginationQuerySchema } from "../../utils/pagination";
import { idParamsSchema } from "../../utils/schema";
import * as updateController from "./update.controller";
import { createUpdateSchema, mediaParamsSchema } from "./update.validator";

const router = Router();
const devOnly = requireRole("dev");

// Developers: done tasks, and publishing an update ("This task is implemented")
router.get("/tasks", devOnly, updateController.listDoneTasks);
router.post("/", devOnly, uploadMedia, validate({ body: createUpdateSchema }), updateController.publishUpdate);

// Everyone: read published updates (opened from a notification)
router.get("/", validate({ query: paginationQuerySchema }), updateController.listUpdates);
router.get("/:id", validate({ params: idParamsSchema }), updateController.getUpdate);
router.get("/:id/media/:index", validate({ params: mediaParamsSchema }), updateController.getMedia);
router.post("/:id/read", validate({ params: idParamsSchema }), updateController.markRead);

export default router;
