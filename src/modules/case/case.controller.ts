import type { Request, Response } from "express";
import { getUserId } from "../../middlewares/auth.middleware";
import { sendSuccess } from "../../utils/apiResponse";
import type { IdParams } from "../../utils/schema";
import * as caseService from "./case.service";
import { listHistory } from "./case.history";
import type { CaseInput, CaseQuery } from "./case.types";

export async function listCases(req: Request, res: Response) {
  // validate() already parsed the query
  const query = req.query as unknown as CaseQuery;
  const { cases, pagination } = await caseService.listCases(getUserId(req), query);
  sendSuccess(res, cases, 200, pagination);
}

export async function getCase(req: Request<IdParams>, res: Response) {
  sendSuccess(res, await caseService.getCase(getUserId(req), req.params.id));
}

export async function getCaseHistory(req: Request<IdParams>, res: Response) {
  await caseService.getCase(getUserId(req), req.params.id); // 404 when the case does not exist
  sendSuccess(res, await listHistory(getUserId(req), req.params.id));
}

export async function createCase(req: Request<object, unknown, CaseInput>, res: Response) {
  sendSuccess(res, await caseService.createCase(getUserId(req), req.body), 201);
}

export async function updateCase(req: Request<IdParams, unknown, CaseInput>, res: Response) {
  sendSuccess(res, await caseService.updateCase(getUserId(req), req.params.id, req.body));
}

export async function deleteCase(req: Request<IdParams>, res: Response) {
  await caseService.deleteCase(getUserId(req), req.params.id);
  res.status(204).send();
}
