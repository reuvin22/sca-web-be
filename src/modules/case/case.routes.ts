import { Router } from "express";
import { validate } from "../../middlewares/validate.middleware";
import { idParamsSchema } from "../../utils/schema";
import * as caseController from "./case.controller";
import { caseQuerySchema, caseSchema } from "./case.validator";

const router = Router();

router.get("/", validate({ query: caseQuerySchema }), caseController.listCases);
router.get("/:id", validate({ params: idParamsSchema }), caseController.getCase);
router.get("/:id/history", validate({ params: idParamsSchema }), caseController.getCaseHistory);
router.post("/", validate({ body: caseSchema }), caseController.createCase);
router.put("/:id", validate({ params: idParamsSchema, body: caseSchema }), caseController.updateCase);
router.delete("/:id", validate({ params: idParamsSchema }), caseController.deleteCase);

export default router;
