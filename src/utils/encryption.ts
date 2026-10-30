import crypto from "node:crypto";
import { env } from "../config/env";

// AES-256-GCM: two-way encryption for sensitive fields (e.g. phone).
// Every field encrypted with this helper must be listed in ENCRYPTED_DATA.md.
const ALGORITHM = "aes-256-gcm";
const KEY = Buffer.from(env.ENCRYPTION_KEY, "hex");
const IV_LENGTH = 12;

// Returns "iv:authTag:encryptedText" (all base64) so it can be stored in one column.
export function encrypt(plainText: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv, authTag, encrypted].map((part) => part.toString("base64")).join(":");
}

export function decrypt(storedValue: string): string {
  const [iv, authTag, encrypted] = storedValue.split(":").map((part) => Buffer.from(part, "base64"));
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

// Encrypts a whole object as JSON (used for groups of sensitive fields).
export function encryptJson(value: unknown): string {
  return encrypt(JSON.stringify(value));
}

export function decryptJson<T>(storedValue: string): T {
  return JSON.parse(decrypt(storedValue)) as T;
}

// Optional text: empty values are stored as null.
export function encryptOptional(value: string): string | null {
  return value ? encrypt(value) : null;
}

export function decryptOptional(storedValue: string | null): string {
  return storedValue ? decrypt(storedValue) : "";
}

// File contents: stored as [iv (12 bytes)][authTag (16 bytes)][encrypted bytes]
export function encryptBuffer(data: Buffer): Buffer {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]);
}

export function decryptBuffer(stored: Buffer): Buffer {
  const iv = stored.subarray(0, IV_LENGTH);
  const authTag = stored.subarray(IV_LENGTH, IV_LENGTH + 16);
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(stored.subarray(IV_LENGTH + 16)), decipher.final()]);
}

// One-way keyed hash (HMAC-SHA256) of a value that is stored encrypted, so it can still be
// looked up or checked for duplicates (encrypted values differ every time). Not reversible.
export function lookupHash(value: string): string {
  return crypto.createHmac("sha256", KEY).update(value).digest("hex");
}

// Fully encrypted records keep all their content in one encrypted `data` field (JSON).
// Records saved before that have plain fields instead; services read both until
// `npm run db:encrypt-all` converts them.
export const isSealed = (raw: object): raw is { data: string } => typeof (raw as { data?: unknown }).data === "string";
