import { Router } from "express";
import { validate } from "../../middlewares/validate.middleware";
import * as reportController from "./report.controller";
import { periodQuerySchema } from "./report.validator";

const router = Router();

router.get("/dashboard", reportController.getDashboard);
router.get("/summary", reportController.getSummary);
router.get("/period", validate({ query: periodQuerySchema }), reportController.getPeriodReport);
router.get("/notifications", reportController.getNotifications);

export default router;
