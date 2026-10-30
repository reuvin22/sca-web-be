import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import appointmentRoutes from "../modules/appointment/appointment.routes";
import authRoutes from "../modules/auth/auth.routes";
import caseRoutes from "../modules/case/case.routes";
import categoryRoutes from "../modules/category/category.routes";
import fileRoutes from "../modules/file/file.routes";
import profileRoutes from "../modules/profile/profile.routes";
import reportRoutes from "../modules/report/report.routes";
import studentRoutes from "../modules/student/student.routes";
import supportRoutes from "../modules/support/support.routes";
import todoRoutes from "../modules/todo/todo.routes";

// All version 1 endpoints. Mounted at /api/v1 in app.ts.
const router = Router();

// Public
router.use("/auth", authRoutes);

// Everything below needs a signed-in user
router.use(requireAuth);
router.use("/profile", profileRoutes);
router.use("/students", studentRoutes);
router.use("/cases", caseRoutes);
router.use("/appointments", appointmentRoutes);
router.use("/categories", categoryRoutes);
router.use("/todo", todoRoutes);
router.use("/files", fileRoutes);
router.use("/support", supportRoutes);
router.use("/reports", reportRoutes);

export default router;
