import { Router } from "express";
import * as reportController from "./report.controller";

// No request input, so there is nothing to validate.
const router = Router();

router.get("/dashboard", reportController.getDashboard);
router.get("/summary", reportController.getSummary);
router.get("/notifications", reportController.getNotifications);

export default router;
