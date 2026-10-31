import { Router } from "express";
import { formAnswerLimiter, publicFormLimiter } from "../../middlewares/rateLimit.middleware";
import { validate } from "../../middlewares/validate.middleware";
import * as formController from "./form.controller";
import { answersSchema, linkCodeParamsSchema } from "./form.validator";

// Public answer links: anyone with the link can open the form and send answers (no sign-in).
// Mounted before requireAuth in v1.routes.
const router = Router();

router.use(publicFormLimiter);
router.get("/:code", validate({ params: linkCodeParamsSchema }), formController.getPublicForm);
router.post(
  "/:code/responses",
  formAnswerLimiter,
  validate({ params: linkCodeParamsSchema, body: answersSchema }),
  formController.submitAnswers,
);

export default router;
