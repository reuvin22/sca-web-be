import { env } from "../../config/env";
import { db } from "../../config/firebase";
import { ApiError } from "../../utils/apiError";
import { sendEmail } from "../../utils/mailer";
import { generateToken, hashToken } from "../../utils/token";
import { confirmationEmail, resetPasswordEmail } from "./auth.email";
import type { AuthTokenDoc, AuthTokenType } from "./auth.types";

// One-time email link tokens (verify email, reset password).
// Stored at authTokens/{hash of the token}, so the raw token is never saved.
const tokensCollection = db.collection("authTokens");

// How long each link works, which frontend page it opens, and its email template
const TOKEN_SETTINGS = {
  VERIFY_EMAIL: { hours: 24, path: "/verify-email", template: confirmationEmail },
  RESET_PASSWORD: { hours: 1, path: "/reset-password", template: resetPasswordEmail },
} satisfies Record<AuthTokenType, unknown>;

async function deleteTokens(userId: string, type: AuthTokenType) {
  const old = await tokensCollection.where("userId", "==", userId).where("type", "==", type).get();
  const batch = db.batch();
  old.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

// Replaces any older token of the same type and emails the new link.
export async function sendTokenEmail(user: { id: string; email: string; name: string }, type: AuthTokenType) {
  const { hours, path, template } = TOKEN_SETTINGS[type];
  const token = generateToken();

  await deleteTokens(user.id, type);
  const tokenDoc: AuthTokenDoc = { userId: user.id, type, expiresAt: Date.now() + hours * 60 * 60 * 1000 };
  await tokensCollection.doc(hashToken(token)).set(tokenDoc);

  // The private link: only someone with this email can open it
  const link = `${env.CLIENT_URL}${path}?token=${token}`;
  await sendEmail({ to: user.email, ...template(user.name, user.email, link) });
}

// Returns the token owner's id and deletes the token (it can only be used once).
export async function consumeToken(token: string, type: AuthTokenType): Promise<string> {
  const snapshot = await tokensCollection.doc(hashToken(token)).get();
  const found = snapshot.data() as AuthTokenDoc | undefined;

  if (!found || found.type !== type || found.expiresAt < Date.now()) {
    const linkName = type === "VERIFY_EMAIL" ? "confirmation" : "reset";
    throw new ApiError(400, `This ${linkName} link is invalid or has expired.`);
  }

  await deleteTokens(found.userId, type);
  return found.userId;
}
