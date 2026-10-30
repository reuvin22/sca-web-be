import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import {
  emailLimiter,
  forgotPasswordLimiter,
  loginCodeLimiter,
  loginLimiter,
  tokenLimiter,
} from "../../middlewares/rateLimit.middleware";
import { validate } from "../../middlewares/validate.middleware";
import * as authController from "./auth.controller";
import {
  challengeSchema,
  emailSchema,
  googleLoginSchema,
  invitationParamsSchema,
  loginCodeSchema,
  loginSchema,
  registerDeveloperSchema,
  registerSchema,
  resetPasswordSchema,
  tokenSchema,
} from "./auth.validator";

const router = Router();

router.post("/register", emailLimiter, validate({ body: registerSchema }), authController.register);
// Password sign-in has two steps: password → { challenge }, then the 6-digit code from the email
router.post("/login", loginLimiter, validate({ body: loginSchema }), authController.login);
router.post("/login/verify", loginCodeLimiter, validate({ body: loginCodeSchema }), authController.verifyLoginCode);
router.post("/login/resend", forgotPasswordLimiter, validate({ body: challengeSchema }), authController.resendLoginCode);
router.post("/google", loginLimiter, validate({ body: googleLoginSchema }), authController.loginWithGoogle);
router.post("/verify-email", tokenLimiter, validate({ body: tokenSchema }), authController.verifyEmail);
router.post("/resend-confirmation", emailLimiter, validate({ body: emailSchema }), authController.resendConfirmation);
router.post("/forgot-password", forgotPasswordLimiter, validate({ body: emailSchema }), authController.forgotPassword);
router.post("/reset-password", tokenLimiter, validate({ body: resetPasswordSchema }), authController.resetPassword);
router.get("/me", requireAuth, authController.getMe);
router.post("/logout", requireAuth, authController.logout);
router.post("/logout-all", requireAuth, authController.logoutEverywhere);

// Developer invitations (the link in the invitation email)
router.get("/invitations/:token", tokenLimiter, validate({ params: invitationParamsSchema }), authController.getInvitation);
router.post("/register-developer", tokenLimiter, validate({ body: registerDeveloperSchema }), authController.registerDeveloper);
router.post("/accept-invitation", tokenLimiter, validate({ body: tokenSchema }), authController.acceptInvitation);

export default router;
