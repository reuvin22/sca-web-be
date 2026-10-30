import { Router } from "express";
import { validate } from "../../middlewares/validate.middleware";
import * as supportController from "./support.controller";
import { supportRequestSchema } from "./support.validator";

const router = Router();

router.post("/", validate({ body: supportRequestSchema }), supportController.createSupportRequest);

export default router;
