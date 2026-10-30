import { Router } from "express";
import { cacheResponse } from "../../middlewares/cache.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { paginationQuerySchema } from "../../utils/pagination";
import { idParamsSchema } from "../../utils/schema";
import * as categoryController from "./category.controller";
import { CATEGORY_CACHE_PREFIX } from "./category.service";
import { createCategorySchema, updateOptionsSchema } from "./category.validator";

const router = Router();

router.get(
  "/",
  validate({ query: paginationQuerySchema }),
  cacheResponse(CATEGORY_CACHE_PREFIX),
  categoryController.listCategories,
);
router.post("/", validate({ body: createCategorySchema }), categoryController.createCategory);
router.patch(
  "/:id/options",
  validate({ params: idParamsSchema, body: updateOptionsSchema }),
  categoryController.updateOptions,
);
router.delete("/:id", validate({ params: idParamsSchema }), categoryController.deleteCategory);

export default router;
