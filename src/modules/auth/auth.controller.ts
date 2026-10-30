import type { Request, Response } from "express";
import { getUserId } from "../../middlewares/auth.middleware";
import { sendSuccess } from "../../utils/apiResponse";
import * as profileService from "../profile/profile.service";
import * as authService from "./auth.service";
import type {
  EmailInput,
  GoogleLoginInput,
  InvitationParams,
  RegisterDeveloperInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  TokenInput,
} from "./auth.types";

export async function register(req: Request<object, unknown, RegisterInput>, res: Response) {
  sendSuccess(res, await authService.register(req.body), 201);
}

export async function login(req: Request<object, unknown, LoginInput>, res: Response) {
  sendSuccess(res, await authService.login(req.body));
}

export async function loginWithGoogle(req: Request<object, unknown, GoogleLoginInput>, res: Response) {
  sendSuccess(res, await authService.loginWithGoogle(req.body));
}

export async function verifyEmail(req: Request<object, unknown, TokenInput>, res: Response) {
  sendSuccess(res, await authService.verifyEmail(req.body.token));
}

export async function resendConfirmation(req: Request<object, unknown, EmailInput>, res: Response) {
  sendSuccess(res, await authService.resendConfirmation(req.body.email));
}

export async function forgotPassword(req: Request<object, unknown, EmailInput>, res: Response) {
  sendSuccess(res, await authService.forgotPassword(req.body.email));
}

export async function resetPassword(req: Request<object, unknown, ResetPasswordInput>, res: Response) {
  await authService.resetPassword(req.body);
  sendSuccess(res, { reset: true });
}

export async function getMe(req: Request, res: Response) {
  sendSuccess(res, await profileService.getProfile(getUserId(req)));
}

export async function getInvitation(req: Request<InvitationParams>, res: Response) {
  sendSuccess(res, await authService.getInvitation(req.params.token));
}

export async function registerDeveloper(req: Request<object, unknown, RegisterDeveloperInput>, res: Response) {
  sendSuccess(res, await authService.registerDeveloper(req.body), 201);
}
