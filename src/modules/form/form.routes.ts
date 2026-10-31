import { Router } from "express";
import { validate } from "../../middlewares/validate.middleware";
import { idParamsSchema } from "../../utils/schema";
import * as formController from "./form.controller";
import { paginationQuerySchema } from "../../utils/pagination";
import { exportSchema, formDraftSchema, formQuerySchema, formSchema } from "./form.validator";

const router = Router();

router.get("/", validate({ query: formQuerySchema }), formController.listForms);
router.get("/:id", validate({ params: idParamsSchema }), formController.getForm);
router.post("/", validate({ body: formSchema }), formController.createForm);
// Unfinished work kept when the user leaves the builder (nothing required)
router.post("/drafts", validate({ body: formDraftSchema }), formController.saveNewDraft);
router.put("/:id/draft", validate({ params: idParamsSchema, body: formDraftSchema }), formController.saveDraft);
router.delete("/:id/draft", validate({ params: idParamsSchema }), formController.discardPending);
router.put("/:id", validate({ params: idParamsSchema, body: formSchema }), formController.updateForm);
router.delete("/:id", validate({ params: idParamsSchema }), formController.deleteForm);

// Public answer link, export counts and responses (owner only)
router.get("/:id/summary", validate({ params: idParamsSchema }), formController.getSummary);
router.post("/:id/link", validate({ params: idParamsSchema }), formController.createLink);
router.delete("/:id/link", validate({ params: idParamsSchema }), formController.removeLink);
router.post("/:id/exports", validate({ params: idParamsSchema, body: exportSchema }), formController.recordExport);
router.get("/:id/responses", validate({ params: idParamsSchema, query: paginationQuerySchema }), formController.listResponses);

export default router;
