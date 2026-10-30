import crypto from "node:crypto";

// One-time tokens for email links (verify email, reset password).
// The raw token goes in the email; only its hash is saved in the database.

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Short readable IDs shown in the UI, e.g. CASE#1234-5678, INV-1234
const random4 = () => String(crypto.randomInt(0, 10000)).padStart(4, "0");

export const generateCaseNumber = () => `CASE#${random4()}-${random4()}`;
export const generateRecordId = () => `INV-${random4()}${random4()}`;
export const generateAppointmentId = () => `APT-${random4()}${random4()}`;
