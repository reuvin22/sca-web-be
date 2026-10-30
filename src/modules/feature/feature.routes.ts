import { Router } from "express";
import { validate } from "../../middlewares/validate.middleware";
import { idParamsSchema } from "../../utils/schema";
import * as featureController from "./feature.controller";
import { featureQuerySchema, myFeaturesQuerySchema } from "./feature.validator";

// Every signed-in user. New requests are sent with POST /support (type "feature").
const router = Router();

router.get("/", validate({ query: featureQuerySchema }), featureController.listFeatures);
router.get("/mine", validate({ query: myFeaturesQuerySchema }), featureController.listMyFeatures);
router.post("/:id/vote", validate({ params: idParamsSchema }), featureController.toggleVote);

export default router;
