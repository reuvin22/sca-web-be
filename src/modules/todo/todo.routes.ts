import { Router } from "express";
import { validate } from "../../middlewares/validate.middleware";
import * as todoController from "./todo.controller";
import { boardSchema } from "./todo.validator";

const router = Router();

router.get("/board", todoController.getBoard);
router.put("/board", validate({ body: boardSchema }), todoController.saveBoard);

export default router;
