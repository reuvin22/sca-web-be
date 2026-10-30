import crypto from "node:crypto";
import { env } from "../config/env";

// AES-256-GCM: two-way encryption for every stored field and file (see CLAUDE.md: encrypt by default).
// Every field encrypted with this helper must be listed in ENCRYPTED_DATA.md.
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

// New data always uses ENCRYPTION_KEY. During a key rotation, ENCRYPTION_KEY_PREVIOUS (the old key)
// is still tried when reading, until `npm run db:rotate-key` has re-encrypted everything.
const KEY = Buffer.from(env.ENCRYPTION_KEY, "hex");
const READ_KEYS = [KEY, ...(env.ENCRYPTION_KEY_PREVIOUS ? [Buffer.from(env.ENCRYPTION_KEY_PREVIOUS, "hex")] : [])];

function decryptWithAnyKey(iv: Buffer, authTag: Buffer, encrypted: Buffer): Buffer {
  for (const key of READ_KEYS) {
    try {
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      return Buffer.concat([decipher.update(encrypted), decipher.final()]);
    } catch {
      // Wrong key (GCM checks the auth tag): try the next one
    }
  }
  throw new Error("Could not decrypt: the data was encrypted with an unknown key");
}

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
  return decryptWithAnyKey(iv, authTag, encrypted).toString("utf8");
}

// True for a value made by encrypt(): a 12-byte IV and a 16-byte auth tag in base64, then the data.
// Used to read older records that still have plain text.
const CIPHER_TEXT = /^[A-Za-z0-9+/]{16}:[A-Za-z0-9+/]{22}==:[A-Za-z0-9+/]*={0,2}$/;
export const isCipherText = (value: unknown): value is string => typeof value === "string" && CIPHER_TEXT.test(value);

// Encrypted text, or plain text from an older record
export const readText = (value: string | null | undefined) => (isCipherText(value) ? decrypt(value) : (value ?? ""));

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
  const authTag = stored.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  return decryptWithAnyKey(iv, authTag, stored.subarray(IV_LENGTH + TAG_LENGTH));
}

// One-way keyed hash (HMAC-SHA256) of a value that is stored encrypted, so it can still be
// looked up or checked for duplicates (encrypted values differ every time). Not reversible.
export function lookupHash(value: string): string {
  return crypto.createHmac("sha256", KEY).update(value).digest("hex");
}

// The hash with every key that may still be in use (for lookups during a key rotation)
export const lookupHashes = (value: string) =>
  READ_KEYS.map((key) => crypto.createHmac("sha256", key).update(value).digest("hex"));

// Fully encrypted records keep all their content in one encrypted `data` field (JSON).
// Records saved before that have plain fields instead; services read both until
// `npm run db:encrypt-all` converts them.
export const isSealed = (raw: object): raw is { data: string } => typeof (raw as { data?: unknown }).data === "string";
