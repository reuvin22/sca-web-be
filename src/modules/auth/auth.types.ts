import type { z } from "zod";
import type {
  invitationParamsSchema,
  registerDeveloperSchema,
  emailSchema,
  googleLoginSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  tokenSchema,
} from "./auth.validator";

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type GoogleLoginInput = z.infer<typeof googleLoginSchema>;
export type EmailInput = z.infer<typeof emailSchema>;
export type TokenInput = z.infer<typeof tokenSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export type AuthTokenType = "VERIFY_EMAIL" | "RESET_PASSWORD" | "DEV_INVITE";

// Firestore: authTokens/{tokenHash}
export interface AuthTokenDoc {
  userId: string; // "" for invitations (the account doesn't exist yet)
  email?: string; // invitations only: the invited email address
  type: AuthTokenType;
  expiresAt: number; // milliseconds since 1970
}

export type InvitationParams = z.infer<typeof invitationParamsSchema>;
export type RegisterDeveloperInput = z.infer<typeof registerDeveloperSchema>;
