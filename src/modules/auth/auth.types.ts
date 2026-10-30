import type { z } from "zod";
import type {
  challengeSchema,
  invitationParamsSchema,
  loginCodeSchema,
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
export type LoginCodeInput = z.infer<typeof loginCodeSchema>;
export type ChallengeInput = z.infer<typeof challengeSchema>;
export type GoogleLoginInput = z.infer<typeof googleLoginSchema>;
export type EmailInput = z.infer<typeof emailSchema>;
export type TokenInput = z.infer<typeof tokenSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export type AuthTokenType = "VERIFY_EMAIL" | "RESET_PASSWORD" | "DEV_INVITE" | "LOGIN_CODE";

// Firestore: authTokens/{SHA-256 of the token}
export interface AuthTokenDoc {
  userId: string; // "" for invitations (the account may not exist yet)
  email?: string; // invitations only: the invited email, AES-256-GCM encrypted
  emailHash?: string; // invitations only: lookup hash of the invited email
  codeHash?: string; // sign-in codes only: SHA-256 of the challenge + code
  attempts?: number; // sign-in codes only: wrong codes entered so far
  type: AuthTokenType;
  expiresAt: number; // milliseconds since 1970
}

export type InvitationParams = z.infer<typeof invitationParamsSchema>;
export type RegisterDeveloperInput = z.infer<typeof registerDeveloperSchema>;
