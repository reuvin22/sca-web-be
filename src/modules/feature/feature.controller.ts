import type { Request, Response } from "express";
import { getUserId } from "../../middlewares/auth.middleware";
import { sendSuccess } from "../../utils/apiResponse";
import type { PaginationQuery } from "../../utils/pagination";
import type { IdParams } from "../../utils/schema";
import * as featureService from "./feature.service";
import type { FeatureQuery } from "./feature.types";

export async function listFeatures(req: Request, res: Response) {
  // validate() already parsed the query
  const { features, pagination } = await featureService.listFeatures(getUserId(req), req.query as unknown as FeatureQuery);
  sendSuccess(res, features, 200, pagination);
}

export async function listMyFeatures(req: Request, res: Response) {
  const query = req.query as unknown as PaginationQuery;
  const { features, pagination } = await featureService.listMyFeatures(getUserId(req), query);
  sendSuccess(res, features, 200, pagination);
}

export async function toggleVote(req: Request<IdParams>, res: Response) {
  sendSuccess(res, await featureService.toggleVote(getUserId(req), req.params.id));
}
