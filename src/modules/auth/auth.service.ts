import { db, firebaseAuth } from "../../config/firebase";
import { ApiError } from "../../utils/apiError";
import { nowIso } from "../../utils/date";
import { userCollection, usersCollection } from "../../utils/firestore";
import { signAccessToken } from "../../utils/jwt";
import { DEFAULT_ACCESS_ROLE, type AccessRole } from "../../utils/roles";
import { comparePassword, hashPassword } from "../../utils/password";
import { DEFAULT_CATEGORIES } from "../category/category.defaults";
import { EMPTY_SCHOOL } from "../profile/profile.service";
import * as profileService from "../profile/profile.service";
import type { UserDoc } from "../profile/profile.types";
import { consumeInvitation, consumeToken, peekInvitation, sendTokenEmail } from "./auth.token.service";
import type { GoogleLoginInput, LoginInput, RegisterDeveloperInput, RegisterInput, ResetPasswordInput } from "./auth.types";

type NewAccount = Pick<UserDoc, "name" | "email" | "password" | "firebaseUid" | "emailVerifiedAt"> & {
  accessRole?: AccessRole; // defaults to sca-1; invited developers get "dev"
};

async function findUserByEmail(email: string) {
  const snapshot = await usersCollection.where("email", "==", email).limit(1).get();
  const doc = snapshot.docs[0];
  return doc ? { id: doc.id, ...(doc.data() as UserDoc) } : null;
}

// Creates the user with an empty school profile and the default Settings categories.
// Runs in a transaction so two sign-ups with the same email can't both succeed.
export async function createAccount(account: NewAccount) {
  const userRef = usersCollection.doc();

  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(usersCollection.where("email", "==", account.email).limit(1));
    if (!existing.empty) throw new ApiError(409, "An account with this email already exists");

    const user: UserDoc = {
      ...account,
      accessRole: account.accessRole ?? DEFAULT_ACCESS_ROLE,
      role: account.accessRole === "dev" ? "Developer" : "School Counselor Associate",
      phone: null,
      school: EMPTY_SCHOOL,
      createdAt: nowIso(),
    };
    transaction.create(userRef, user);

    const categories = userCollection(userRef.id, "categories");
    DEFAULT_CATEGORIES.forEach((category, index) => {
      // Lists show newest first, so earlier defaults get later times to keep the default order
      const createdAt = new Date(Date.now() - index).toISOString();
      transaction.create(categories.doc(), { ...category, createdAt });
    });
  });

  return { id: userRef.id, email: account.email, name: account.name };
}

// Login response: our JWT plus the { user, school } profile the frontend stores.
async function buildSession(userId: string) {
  return { token: signAccessToken({ userId }), profile: await profileService.getProfile(userId) };
}

export async function register(input: RegisterInput) {
  const user = await createAccount({
    name: input.fullName,
    email: input.email,
    password: await hashPassword(input.password),
    firebaseUid: null,
    emailVerifiedAt: null,
  });

  // The account already exists, so a failed email shouldn't fail sign-up.
  // The "Check your email" page has a Resend button that tries again.
  await sendTokenEmail(user, "VERIFY_EMAIL").catch((error: unknown) => {
    console.error("Confirmation email failed after registration:", error);
  });
  return { email: user.email };
}

export async function login(input: LoginInput) {
  const user = await findUserByEmail(input.email);

  // Same message for unknown email and wrong password, so emails can't be guessed.
  const valid = user?.password ? await comparePassword(input.password, user.password) : false;
  if (!user || !valid) throw new ApiError(401, "Invalid email or password");
  if (!user.emailVerifiedAt) throw new ApiError(403, "Please confirm your email before signing in");

  return buildSession(user.id);
}

// Google sign-in happens in the browser with Firebase Auth.
// We verify its ID token here and then issue our own JWT, same as email/password login.
export async function loginWithGoogle({ idToken }: GoogleLoginInput) {
  const decoded = await firebaseAuth.verifyIdToken(idToken).catch(() => {
    throw new ApiError(401, "Google sign-in failed. Please try again.");
  });
  if (!decoded.email || !decoded.email_verified) {
    throw new ApiError(401, "Your Google account email is not verified");
  }
  const email = decoded.email.toLowerCase();

  const byUid = await usersCollection.where("firebaseUid", "==", decoded.uid).limit(1).get();
  if (!byUid.empty) return buildSession(byUid.docs[0].id);

  const existing = await findUserByEmail(email);
  if (existing) {
    // First Google sign-in for an email/password account: link it.
    await usersCollection.doc(existing.id).update({
      firebaseUid: decoded.uid,
      emailVerifiedAt: existing.emailVerifiedAt ?? nowIso(),
    });
    return buildSession(existing.id);
  }

  const googleName = typeof decoded.name === "string" ? decoded.name.slice(0, 100) : "";
  const user = await createAccount({
    name: googleName || email,
    email,
    password: null,
    firebaseUid: decoded.uid,
    emailVerifiedAt: nowIso(),
  });
  return buildSession(user.id);
}

// Opening the private link proves the user owns the email, so we sign them in right away.
export async function verifyEmail(token: string) {
  const userId = await consumeToken(token, "VERIFY_EMAIL");
  await usersCollection.doc(userId).update({ emailVerifiedAt: nowIso() });
  return buildSession(userId);
}

// Always succeeds so the response doesn't reveal whether the email is registered.
export async function resendConfirmation(email: string) {
  const user = await findUserByEmail(email);
  if (user && !user.emailVerifiedAt) await sendTokenEmail(user, "VERIFY_EMAIL");
  return { email };
}

// Always succeeds so the response doesn't reveal whether the email is registered.
export async function forgotPassword(email: string) {
  const user = await findUserByEmail(email);
  if (user) await sendTokenEmail(user, "RESET_PASSWORD");
  return { email };
}

export async function resetPassword({ token, password }: ResetPasswordInput) {
  const userId = await consumeToken(token, "RESET_PASSWORD");
  const ref = usersCollection.doc(userId);
  const user = (await ref.get()).data() as UserDoc;

  // Opening the emailed link also proves the user owns the email.
  await ref.update({ password: await hashPassword(password), emailVerifiedAt: user.emailVerifiedAt ?? nowIso() });
}

// Shows the invited email on the developer registration page
export function getInvitation(token: string) {
  return peekInvitation(token);
}

// Creates a developer account from an invitation. The invitation proves the email, so it is verified.
// The invitation is used up only after the account exists, so a failed sign-up can be retried.
export async function registerDeveloper({ token, fullName, password }: RegisterDeveloperInput) {
  const { email } = await peekInvitation(token);
  const user = await createAccount({
    name: fullName,
    email,
    password: await hashPassword(password),
    firebaseUid: null,
    emailVerifiedAt: nowIso(),
    accessRole: "dev",
  });
  await consumeInvitation(token);
  return buildSession(user.id);
}
