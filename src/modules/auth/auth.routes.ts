import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { emailLimiter, forgotPasswordLimiter, loginLimiter, tokenLimiter } from "../../middlewares/rateLimit.middleware";
import { validate } from "../../middlewares/validate.middleware";
import * as authController from "./auth.controller";
import {
  emailSchema,
  googleLoginSchema,
  invitationParamsSchema,
  loginSchema,
  registerDeveloperSchema,
  registerSchema,
  resetPasswordSchema,
  tokenSchema,
} from "./auth.validator";

const router = Router();

router.post("/register", emailLimiter, validate({ body: registerSchema }), authController.register);
router.post("/login", loginLimiter, validate({ body: loginSchema }), authController.login);
router.post("/google", loginLimiter, validate({ body: googleLoginSchema }), authController.loginWithGoogle);
router.post("/verify-email", tokenLimiter, validate({ body: tokenSchema }), authController.verifyEmail);
router.post("/resend-confirmation", emailLimiter, validate({ body: emailSchema }), authController.resendConfirmation);
router.post("/forgot-password", forgotPasswordLimiter, validate({ body: emailSchema }), authController.forgotPassword);
router.post("/reset-password", tokenLimiter, validate({ body: resetPasswordSchema }), authController.resetPassword);
router.get("/me", requireAuth, authController.getMe);

// Developer invitations (the link in the invitation email)
router.get("/invitations/:token", tokenLimiter, validate({ params: invitationParamsSchema }), authController.getInvitation);
router.post("/register-developer", tokenLimiter, validate({ body: registerDeveloperSchema }), authController.registerDeveloper);

export default router;
