import { Router } from "express";
import { validate } from "../../middlewares/validate.middleware";
import { idParamsSchema } from "../../utils/schema";
import * as appointmentController from "./appointment.controller";
import { appointmentQuerySchema, appointmentSchema } from "./appointment.validator";

const router = Router();

router.get("/", validate({ query: appointmentQuerySchema }), appointmentController.listAppointments);
router.get("/:id", validate({ params: idParamsSchema }), appointmentController.getAppointment);
router.post("/", validate({ body: appointmentSchema }), appointmentController.createAppointment);
router.put(
  "/:id",
  validate({ params: idParamsSchema, body: appointmentSchema }),
  appointmentController.updateAppointment,
);
router.delete("/:id", validate({ params: idParamsSchema }), appointmentController.deleteAppointment);

export default router;
