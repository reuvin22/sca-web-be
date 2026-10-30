import { Router } from "express";
import * as notificationController from "./notification.controller";

// Real-time notifications. No request input, so there is nothing to validate.
// Events: "system-update" { id, title, reportType, publishedAt, read } when a developer publishes an update.
const router = Router();

router.get("/stream", notificationController.stream);

export default router;
