import type { Request, Response } from "express";
import { getUserId } from "../../middlewares/auth.middleware";
import { sendSuccess } from "../../utils/apiResponse";
import type { PaginationQuery } from "../../utils/pagination";
import * as auditService from "./audit.service";

// The signed-in user's own activity log (Profile → Recent activity)
export async function listActivity(req: Request, res: Response) {
  // validate() already converted the query to numbers
  const { activity, pagination } = await auditService.listActivity(getUserId(req), req.query as unknown as PaginationQuery);
  sendSuccess(res, activity, 200, pagination);
}
