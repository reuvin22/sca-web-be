import crypto from "node:crypto";
import { env } from "../../config/env";
import { db } from "../../config/firebase";
import { ApiError } from "../../utils/apiError";
import { encrypt, lookupHashes, readText } from "../../utils/encryption";
import { sendEmail } from "../../utils/mailer";
import { generateToken, hashToken } from "../../utils/token";
import { emailHash } from "../profile/profile.user";
import { acceptInvitationEmail, confirmationEmail, invitationEmail, loginCodeEmail, resetPasswordEmail } from "./auth.email";
import type { AuthTokenDoc, AuthTokenType } from "./auth.types";

// One-time tokens: email links (verify email, reset password, developer invitation) and sign-in codes.
// Stored at authTokens/{hash of the token}, so the raw token is never saved.
const tokensCollection = db.collection("authTokens");

// How long each link works, which frontend page it opens, and what it is called in errors
const LINK_SETTINGS = {
  VERIFY_EMAIL: { hours: 24, path: "/verify-email", linkName: "confirmation" },
  RESET_PASSWORD: { hours: 1, path: "/reset-password", linkName: "reset" },
  DEV_INVITE: { hours: 72, path: "/dev-register", linkName: "invitation" },
} as const;

const LOGIN_CODE_MINUTES = 10;
const MAX_CODE_ATTEMPTS = 5;

type LinkType = keyof typeof LINK_SETTINGS;

async function deleteMatching(field: "userId" | "emailHash", values: string[], type: AuthTokenType) {
  const old = await tokensCollection.where(field, "in", values).where("type", "==", type).get();
  const batch = db.batch();
  old.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

// Saves a new link token and returns the private link (the raw token only goes in the email)
async function issueLink(doc: Omit<AuthTokenDoc, "expiresAt">, type: LinkType) {
  const { hours, path } = LINK_SETTINGS[type];
  const token = generateToken();
  const tokenDoc: AuthTokenDoc = { ...doc, type, expiresAt: Date.now() + hours * 60 * 60 * 1000 };
  await tokensCollection.doc(hashToken(token)).set(tokenDoc);
  return `${env.CLIENT_URL}${path}?token=${token}`;
}

// The token's data, or 400 when it is unknown, of another type, or expired
async function findValidToken(token: string, type: LinkType): Promise<AuthTokenDoc> {
  const found = (await tokensCollection.doc(hashToken(token)).get()).data() as AuthTokenDoc | undefined;
  if (!found || found.type !== type || found.expiresAt < Date.now()) {
    throw new ApiError(400, `This ${LINK_SETTINGS[type].linkName} link is invalid or has expired.`);
  }
  return found;
}

// Replaces any older token of the same type and emails the new link.
export async function sendTokenEmail(user: { id: string; email: string; name: string }, type: "VERIFY_EMAIL" | "RESET_PASSWORD") {
  await deleteMatching("userId", [user.id], type);
  const link = await issueLink({ userId: user.id, type }, type);
  const template = type === "VERIFY_EMAIL" ? confirmationEmail : resetPasswordEmail;
  await sendEmail({ to: user.email, ...template(user.name, user.email, link) });
}

// Returns the token owner's id and deletes the token (it can only be used once).
export async function consumeToken(token: string, type: "VERIFY_EMAIL" | "RESET_PASSWORD"): Promise<string> {
  const found = await findValidToken(token, type);
  await deleteMatching("userId", [found.userId], type);
  return found.userId;
}

// Developer invitation for an email address. A new invite replaces an older one for the same email.
// `hasAccount` picks the email: "create your developer account" or "accept the invitation".
export async function sendInvitationEmail(inviterName: string, email: string, hasAccount: boolean) {
  await deleteMatching("emailHash", lookupHashes(`email:${email}`), "DEV_INVITE");
  const link = await issueLink({ userId: "", email: encrypt(email), emailHash: emailHash(email), type: "DEV_INVITE" }, "DEV_INVITE");
  const template = hasAccount ? acceptInvitationEmail : invitationEmail;
  await sendEmail({ to: email, ...template(inviterName, email, link) });
}

// The invited email, without using the invitation up (for the registration page)
export async function peekInvitation(token: string) {
  const found = await findValidToken(token, "DEV_INVITE");
  return { email: readText(found.email) };
}

// Deletes the invitation (it can only be used once)
export async function consumeInvitation(token: string) {
  const { email } = await peekInvitation(token);
  await deleteMatching("emailHash", lookupHashes(`email:${email}`), "DEV_INVITE");
  await tokensCollection.doc(hashToken(token)).delete(); // older invitations without emailHash
}

// ----- Sign-in codes (two-factor authentication for password sign-in) -----

const codeHash = (challenge: string, code: string) => hashToken(`${challenge}:${code}`);

// Emails a new 6-digit code for this challenge (a new challenge when none is given)
export async function sendLoginCode(user: { id: string; email: string; name: string }, challenge = generateToken()) {
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  const doc: AuthTokenDoc = {
    userId: user.id,
    type: "LOGIN_CODE",
    codeHash: codeHash(challenge, code),
    attempts: 0,
    expiresAt: Date.now() + LOGIN_CODE_MINUTES * 60 * 1000,
  };
  await tokensCollection.doc(hashToken(challenge)).set(doc);
  await sendEmail({ to: user.email, ...loginCodeEmail(user.name, code, LOGIN_CODE_MINUTES) });
  return challenge;
}

async function findChallenge(challenge: string) {
  const ref = tokensCollection.doc(hashToken(challenge));
  const found = (await ref.get()).data() as AuthTokenDoc | undefined;
  if (!found || found.type !== "LOGIN_CODE" || found.expiresAt < Date.now()) {
    throw new ApiError(400, "This sign-in code has expired. Please sign in again.");
  }
  return { ref, found };
}

// The user id when the code is right. Wrong codes count; after 5 the challenge is deleted.
export async function checkLoginCode(challenge: string, code: string): Promise<string> {
  const { ref, found } = await findChallenge(challenge);
  const expected = Buffer.from(found.codeHash ?? "", "hex");
  const given = Buffer.from(codeHash(challenge, code), "hex");

  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) {
    const attempts = (found.attempts ?? 0) + 1;
    if (attempts >= MAX_CODE_ATTEMPTS) {
      await ref.delete();
      throw new ApiError(400, "Too many wrong codes. Please sign in again.");
    }
    await ref.update({ attempts });
    throw new ApiError(400, `Wrong code. ${MAX_CODE_ATTEMPTS - attempts} tries left.`);
  }
  await ref.delete();
  return found.userId;
}

// The user waiting for a code on this challenge (to send a new code)
export async function getChallengeUserId(challenge: string) {
  return (await findChallenge(challenge)).found.userId;
}
