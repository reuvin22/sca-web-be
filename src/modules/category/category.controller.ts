import type { Request, Response } from "express";
import { getUserId } from "../../middlewares/auth.middleware";
import { sendSuccess } from "../../utils/apiResponse";
import type { PaginationQuery } from "../../utils/pagination";
import type { IdParams } from "../../utils/schema";
import * as categoryService from "./category.service";
import type { CreateCategoryInput, UpdateOptionsInput } from "./category.types";

export async function listCategories(req: Request, res: Response) {
  // validate() already converted the query to numbers
  const query = req.query as unknown as PaginationQuery;
  const { categories, pagination } = await categoryService.listCategories(getUserId(req), query);
  sendSuccess(res, categories, 200, pagination);
}

export async function createCategory(req: Request<object, unknown, CreateCategoryInput>, res: Response) {
  sendSuccess(res, await categoryService.createCategory(getUserId(req), req.body), 201);
}

export async function renameCategory(req: Request<IdParams, unknown, CreateCategoryInput>, res: Response) {
  sendSuccess(res, await categoryService.renameCategory(getUserId(req), req.params.id, req.body));
}

export async function updateOptions(req: Request<IdParams, unknown, UpdateOptionsInput>, res: Response) {
  sendSuccess(res, await categoryService.updateOptions(getUserId(req), req.params.id, req.body));
}

export async function deleteCategory(req: Request<IdParams>, res: Response) {
  await categoryService.deleteCategory(getUserId(req), req.params.id);
  res.status(204).send();
}
