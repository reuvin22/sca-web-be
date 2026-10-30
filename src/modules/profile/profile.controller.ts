import type { Request, Response } from "express";
import { getUserId } from "../../middlewares/auth.middleware";
import { sendSuccess } from "../../utils/apiResponse";
import * as profileService from "./profile.service";
import type { UpdateProfileInput } from "./profile.types";

export async function getProfile(req: Request, res: Response) {
  sendSuccess(res, await profileService.getProfile(getUserId(req)));
}

export async function updateProfile(req: Request<object, unknown, UpdateProfileInput>, res: Response) {
  sendSuccess(res, await profileService.updateProfile(getUserId(req), req.body));
}
