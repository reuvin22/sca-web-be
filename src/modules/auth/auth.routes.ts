import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
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

router.post("/register", validate({ body: registerSchema }), authController.register);
router.post("/login", validate({ body: loginSchema }), authController.login);
router.post("/google", validate({ body: googleLoginSchema }), authController.loginWithGoogle);
router.post("/verify-email", validate({ body: tokenSchema }), authController.verifyEmail);
router.post("/resend-confirmation", validate({ body: emailSchema }), authController.resendConfirmation);
router.post("/forgot-password", validate({ body: emailSchema }), authController.forgotPassword);
router.post("/reset-password", validate({ body: resetPasswordSchema }), authController.resetPassword);
router.get("/me", requireAuth, authController.getMe);

// Developer invitations (the link in the invitation email)
router.get("/invitations/:token", validate({ params: invitationParamsSchema }), authController.getInvitation);
router.post("/register-developer", validate({ body: registerDeveloperSchema }), authController.registerDeveloper);

export default router;
