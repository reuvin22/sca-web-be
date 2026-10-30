import { Router } from "express";
import { validate } from "../../middlewares/validate.middleware";
import { idParamsSchema } from "../../utils/schema";
import * as studentController from "./student.controller";
import { studentQuerySchema, studentSchema } from "./student.validator";

const router = Router();

router.get("/", validate({ query: studentQuerySchema }), studentController.listStudents);
router.get("/:id", validate({ params: idParamsSchema }), studentController.getStudent);
router.post("/", validate({ body: studentSchema }), studentController.createStudent);
router.put("/:id", validate({ params: idParamsSchema, body: studentSchema }), studentController.updateStudent);
router.delete("/:id", validate({ params: idParamsSchema }), studentController.deleteStudent);

export default router;
