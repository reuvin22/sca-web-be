import type { Request, Response } from "express";
import { getSession, getUserId } from "../../middlewares/auth.middleware";
import { sendSuccess } from "../../utils/apiResponse";
import * as profileService from "../profile/profile.service";
import * as authService from "./auth.service";
import type {
  ChallengeInput,
  EmailInput,
  GoogleLoginInput,
  InvitationParams,
  LoginCodeInput,
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

export async function verifyLoginCode(req: Request<object, unknown, LoginCodeInput>, res: Response) {
  sendSuccess(res, await authService.verifyLoginCode(req.body));
}

export async function resendLoginCode(req: Request<object, unknown, ChallengeInput>, res: Response) {
  sendSuccess(res, await authService.resendLoginCode(req.body.challenge));
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

export async function logout(req: Request, res: Response) {
  await authService.logout(getSession(req));
  sendSuccess(res, { signedOut: true });
}

export async function logoutEverywhere(req: Request, res: Response) {
  await authService.logoutEverywhere(getUserId(req));
  sendSuccess(res, { signedOut: true });
}

export async function getInvitation(req: Request<InvitationParams>, res: Response) {
  sendSuccess(res, await authService.getInvitation(req.params.token));
}

export async function registerDeveloper(req: Request<object, unknown, RegisterDeveloperInput>, res: Response) {
  sendSuccess(res, await authService.registerDeveloper(req.body), 201);
}

export async function acceptInvitation(req: Request<object, unknown, TokenInput>, res: Response) {
  sendSuccess(res, await authService.acceptInvitation(req.body.token));
}
