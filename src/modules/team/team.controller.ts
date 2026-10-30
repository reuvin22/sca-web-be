import type { Request, Response } from "express";
import { getUserId } from "../../middlewares/auth.middleware";
import { sendSuccess } from "../../utils/apiResponse";
import * as teamService from "./team.service";
import type { InviteInput } from "./team.types";

export async function listDevelopers(_req: Request, res: Response) {
  sendSuccess(res, await teamService.listDevelopers());
}

export async function inviteDeveloper(req: Request<object, unknown, InviteInput>, res: Response) {
  sendSuccess(res, await teamService.inviteDeveloper(getUserId(req), req.body.email), 201);
}
