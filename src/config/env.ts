import "dotenv/config";
import { z } from "zod";

function isServiceAccountJson(value: string) {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return typeof parsed.private_key === "string" && typeof parsed.client_email === "string";
  } catch {
    return false;
  }
}

// The only place that reads process.env. The app will not start if anything is missing or invalid.
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  ENCRYPTION_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/, "Must be 64 hex characters (32 bytes)"),
  JWT_SECRET: z.string().min(32, "Must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().regex(/^\d+[smhd]$/, "Use a number + s/m/h/d, e.g. 1d").default("1d"),
  // Frontend URL: allowed by CORS and used in email links
  CLIENT_URL: z.url().transform((url) => url.replace(/\/+$/, "")), // no trailing slash, or CORS fails

  // Firebase service account (Firestore + verifying Google sign-in). Use ONE of these:
  // - FIREBASE_SERVICE_ACCOUNT_JSON: the whole JSON as one value (hosts without secret files, e.g. DigitalOcean)
  // - FIREBASE_SERVICE_ACCOUNT_PATH: path to the JSON file (local sca.json, or a Render secret file)
  FIREBASE_SERVICE_ACCOUNT_JSON: z
    .string()
    .optional()
    .refine((value) => !value || isServiceAccountJson(value), "Must be the service account JSON"),
  FIREBASE_SERVICE_ACCOUNT_PATH: z.string().endsWith(".json").default("sca.json"),

  // Brevo (transactional email). The sender email must be verified in Brevo.
  BREVO_API_KEY: z.string().min(1),
  BREVO_SENDER_EMAIL: z.email(),
  BREVO_SENDER_NAME: z.string().min(1).default("SCA System"),

  // Cloudflare R2 (S3-compatible) bucket for uploaded files
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", z.flattenError(parsed.error).fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
