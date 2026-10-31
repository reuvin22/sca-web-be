import type { Request, Response } from "express";
import { getUserId } from "../../middlewares/auth.middleware";
import { sendSuccess } from "../../utils/apiResponse";
import type { IdParams } from "../../utils/schema";
import type { PaginationQuery } from "../../utils/pagination";
import * as linkService from "./form.link.service";
import * as formService from "./form.service";
import type { FormInput, FormQuery } from "./form.types";

export async function listForms(req: Request, res: Response) {
  // validate() already parsed the query
  const { forms, pagination } = await formService.listForms(getUserId(req), req.query as unknown as FormQuery);
  sendSuccess(res, forms, 200, pagination);
}

export async function getForm(req: Request<IdParams>, res: Response) {
  sendSuccess(res, await formService.getForm(getUserId(req), req.params.id));
}

export async function createForm(req: Request<object, unknown, FormInput>, res: Response) {
  sendSuccess(res, await formService.createForm(getUserId(req), req.body), 201);
}

export async function updateForm(req: Request<IdParams, unknown, FormInput>, res: Response) {
  sendSuccess(res, await formService.updateForm(getUserId(req), req.params.id, req.body));
}

export async function deleteForm(req: Request<IdParams>, res: Response) {
  await formService.deleteForm(getUserId(req), req.params.id);
  res.status(204).send();
}

// ---- Public link, export counts and responses ----

type LinkCodeParams = { code: string };

export async function getSummary(req: Request<IdParams>, res: Response) {
  sendSuccess(res, await linkService.getSummary(getUserId(req), req.params.id));
}

export async function createLink(req: Request<IdParams>, res: Response) {
  sendSuccess(res, await linkService.createLink(getUserId(req), req.params.id), 201);
}

export async function removeLink(req: Request<IdParams>, res: Response) {
  await linkService.removeLink(getUserId(req), req.params.id);
  res.status(204).send();
}

export async function recordExport(req: Request<IdParams, unknown, { format: "pdf" | "word" }>, res: Response) {
  await linkService.recordExport(getUserId(req), req.params.id, req.body.format);
  res.status(204).send();
}

export async function listResponses(req: Request<IdParams>, res: Response) {
  const query = req.query as unknown as PaginationQuery;
  const { responses, pagination } = await linkService.listResponses(getUserId(req), req.params.id, query);
  sendSuccess(res, responses, 200, pagination);
}

export async function getPublicForm(req: Request<LinkCodeParams>, res: Response) {
  sendSuccess(res, await linkService.getPublicForm(req.params.code));
}

export async function submitAnswers(req: Request<LinkCodeParams, unknown, { answers: Record<string, string | string[]> }>, res: Response) {
  sendSuccess(res, await linkService.submitAnswers(req.params.code, req.body.answers), 201);
}
