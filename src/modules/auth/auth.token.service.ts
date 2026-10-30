import { env } from "../../config/env";
import { db } from "../../config/firebase";
import { ApiError } from "../../utils/apiError";
import { sendEmail } from "../../utils/mailer";
import { generateToken, hashToken } from "../../utils/token";
import { confirmationEmail, invitationEmail, resetPasswordEmail } from "./auth.email";
import type { AuthTokenDoc, AuthTokenType } from "./auth.types";

// One-time email link tokens (verify email, reset password, developer invitation).
// Stored at authTokens/{hash of the token}, so the raw token is never saved.
const tokensCollection = db.collection("authTokens");

// How long each link works, which frontend page it opens, and its email template
const TOKEN_SETTINGS = {
  VERIFY_EMAIL: { hours: 24, path: "/verify-email", template: confirmationEmail, linkName: "confirmation" },
  RESET_PASSWORD: { hours: 1, path: "/reset-password", template: resetPasswordEmail, linkName: "reset" },
  DEV_INVITE: { hours: 72, path: "/dev-register", template: invitationEmail, linkName: "invitation" },
} satisfies Record<AuthTokenType, unknown>;

async function deleteMatching(field: "userId" | "email", value: string, type: AuthTokenType) {
  const old = await tokensCollection.where(field, "==", value).where("type", "==", type).get();
  const batch = db.batch();
  old.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

// Saves a new token, emails the private link, and returns nothing (the raw token only goes in the email)
async function issueToken(doc: Omit<AuthTokenDoc, "expiresAt">, recipient: { email: string; name: string }) {
  const { hours, path, template } = TOKEN_SETTINGS[doc.type];
  const token = generateToken();
  const tokenDoc: AuthTokenDoc = { ...doc, expiresAt: Date.now() + hours * 60 * 60 * 1000 };
  await tokensCollection.doc(hashToken(token)).set(tokenDoc);

  // The private link: only someone with this email can open it
  const link = `${env.CLIENT_URL}${path}?token=${token}`;
  await sendEmail({ to: recipient.email, ...template(recipient.name, recipient.email, link) });
}

// The token's data, or 400 when it is unknown, of another type, or expired
async function findValidToken(token: string, type: AuthTokenType): Promise<AuthTokenDoc> {
  const found = (await tokensCollection.doc(hashToken(token)).get()).data() as AuthTokenDoc | undefined;
  if (!found || found.type !== type || found.expiresAt < Date.now()) {
    throw new ApiError(400, `This ${TOKEN_SETTINGS[type].linkName} link is invalid or has expired.`);
  }
  return found;
}

// Replaces any older token of the same type and emails the new link.
export async function sendTokenEmail(user: { id: string; email: string; name: string }, type: "VERIFY_EMAIL" | "RESET_PASSWORD") {
  await deleteMatching("userId", user.id, type);
  await issueToken({ userId: user.id, type }, user);
}

// Returns the token owner's id and deletes the token (it can only be used once).
export async function consumeToken(token: string, type: "VERIFY_EMAIL" | "RESET_PASSWORD"): Promise<string> {
  const found = await findValidToken(token, type);
  await deleteMatching("userId", found.userId, type);
  return found.userId;
}

// Developer invitation for an email address. A new invite replaces an older one for the same email.
// `inviterName` is shown in the email.
export async function sendInvitationEmail(inviterName: string, email: string) {
  await deleteMatching("email", email, "DEV_INVITE");
  await issueToken({ userId: "", email, type: "DEV_INVITE" }, { email, name: inviterName });
}

// The invited email, without using the invitation up (for the registration page)
export async function peekInvitation(token: string) {
  const found = await findValidToken(token, "DEV_INVITE");
  return { email: found.email as string };
}

// The invited email; deletes the invitation (it can only be used once)
export async function consumeInvitation(token: string): Promise<string> {
  const email = (await peekInvitation(token)).email;
  await deleteMatching("email", email, "DEV_INVITE");
  return email;
}
