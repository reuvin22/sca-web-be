import { z } from "zod";
import { addressSchema, mobileSchema } from "../../utils/address";
import { isCommonPassword } from "../../utils/commonPasswords";

const email = z.email().trim().toLowerCase().max(255);
const token = z.string().regex(/^[0-9a-f]{64}$/, "Invalid token");

// New passwords: 8–72 characters (bcrypt only uses the first 72 bytes), with letters and numbers,
// and not one of the most common passwords. Sign-in still accepts older, simpler passwords.
const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72)
  .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), "Use both letters and numbers")
  .refine((value) => !isCommonPassword(value), "This password is too common. Please choose another one");

export const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email,
  password,
  phone: mobileSchema,
  address: addressSchema,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(72),
});

// Second sign-in step: the code from the email, for the challenge returned by /auth/login
export const loginCodeSchema = z.object({
  challenge: token,
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code from your email"),
});

export const challengeSchema = z.object({ challenge: token });

export const googleLoginSchema = z.object({
  idToken: z.string().min(1).max(5000),
});

export const emailSchema = z.object({ email });

export const tokenSchema = z.object({ token });

export const resetPasswordSchema = tokenSchema.extend({ password });

// Developer invitation link: /dev-register?token=...
export const invitationParamsSchema = z.object({
  token: z.string().regex(/^[0-9a-f]{64}$/, "Invalid invitation"),
});

export const registerDeveloperSchema = tokenSchema.extend({
  fullName: z.string().trim().min(2).max(100),
  password,
});
