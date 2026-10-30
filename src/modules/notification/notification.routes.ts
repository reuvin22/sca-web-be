import { Router } from "express";
import { validate } from "../../middlewares/validate.middleware";
import * as notificationController from "./notification.controller";
import { markReadSchema } from "./notification.validator";

// Real-time notifications and read state.
// Stream events: "system-update" { id, title, reportType, publishedAt, read } when a developer publishes an update.
const router = Router();

router.get("/stream", notificationController.stream);
router.post("/read", validate({ body: markReadSchema }), notificationController.markRead);

export default router;
