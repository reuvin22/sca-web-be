import type { Request, Response } from "express";
import { getUserId } from "../../middlewares/auth.middleware";
import { sendSuccess } from "../../utils/apiResponse";
import * as supportService from "./support.service";
import type { SupportRequestInput } from "./support.types";

export async function createSupportRequest(req: Request<object, unknown, SupportRequestInput>, res: Response) {
  sendSuccess(res, await supportService.createSupportRequest(getUserId(req), req.body), 201);
}
