import type { Request, Response } from "express";
import { getUserId } from "../../middlewares/auth.middleware";
import { ApiError } from "../../utils/apiError";
import { sendSuccess } from "../../utils/apiResponse";
import * as profileService from "./profile.service";
import type { UpdateProfileInput } from "./profile.types";

export async function getProfile(req: Request, res: Response) {
  sendSuccess(res, await profileService.getProfile(getUserId(req)));
}

export async function updateProfile(req: Request<object, unknown, UpdateProfileInput>, res: Response) {
  sendSuccess(res, await profileService.updateProfile(getUserId(req), req.body));
}

export async function uploadPhoto(req: Request, res: Response) {
  // uploadProfilePhoto already checked that a photo was sent
  if (!req.file) throw new ApiError(400, "Please choose a photo to upload");
  sendSuccess(res, await profileService.uploadPhoto(getUserId(req), req.file));
}

// The image itself. `private` so shared caches never keep it.
export async function getPhoto(req: Request, res: Response) {
  const { mimeType, content } = await profileService.getPhoto(getUserId(req));
  res.type(mimeType).set("Cache-Control", "private, no-store").send(content);
}

export async function deletePhoto(req: Request, res: Response) {
  sendSuccess(res, await profileService.deletePhoto(getUserId(req)));
}
