import { z } from "zod";
import { addressSchema, mobileSchema } from "../../utils/address";

const email = z.email().trim().toLowerCase().max(255);
// bcrypt only uses the first 72 bytes, so longer passwords are rejected.
const password = z.string().min(8, "Password must be at least 8 characters").max(72);

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

export const googleLoginSchema = z.object({
  idToken: z.string().min(1).max(5000),
});

export const emailSchema = z.object({ email });

export const tokenSchema = z.object({
  token: z.string().regex(/^[0-9a-f]{64}$/, "Invalid token"),
});

export const resetPasswordSchema = tokenSchema.extend({ password });

// Developer invitation link: /dev-register?token=...
export const invitationParamsSchema = z.object({
  token: z.string().regex(/^[0-9a-f]{64}$/, "Invalid invitation"),
});

export const registerDeveloperSchema = tokenSchema.extend({
  fullName: z.string().trim().min(2).max(100),
  password,
});
