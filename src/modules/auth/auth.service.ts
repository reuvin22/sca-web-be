import { db, firebaseAuth } from "../../config/firebase";
import { ApiError } from "../../utils/apiError";
import { nowIso } from "../../utils/date";
import { userCollection, usersCollection } from "../../utils/firestore";
import { encryptAddress, phoneHash } from "../../utils/address";
import { encrypt } from "../../utils/encryption";
import { signAccessToken, signDeviceToken, verifyDeviceToken, type TokenPayload } from "../../utils/jwt";
import { sendEmail } from "../../utils/mailer";
import { DEFAULT_ACCESS_ROLE, hasRole, withRole, type AccessRole } from "../../utils/roles";
import { comparePassword, hashPassword } from "../../utils/password";
import { recordAudit } from "../audit/audit.service";
import { DEFAULT_CATEGORIES } from "../category/category.defaults";
import { toCategoryDoc } from "../category/category.service";
import * as profileService from "../profile/profile.service";
import type { UserDoc } from "../profile/profile.types";
import { EMPTY_SCHOOL, emailQueries, encodeNewUser, findUserByEmail, getUserInfo } from "../profile/profile.user";
import { accountExistsEmail } from "./auth.email";
import { getTokenVersion, revokeAllSessions, revokeSession } from "./auth.session";
import {
  checkLoginCode,
  consumeInvitation,
  consumeToken,
  getChallengeUserId,
  peekInvitation,
  sendLoginCode,
  sendTokenEmail,
} from "./auth.token.service";
import type { GoogleLoginInput, LoginCodeInput, LoginInput, RegisterDeveloperInput, RegisterInput, ResetPasswordInput } from "./auth.types";

interface NewAccount {
  name: string;
  email: string;
  password: string | null; // bcrypt hash
  firebaseUid: string | null;
  emailVerifiedAt: string | null;
  accessRole?: AccessRole; // defaults to sca-1; invited developers get "dev"
  phone?: string | null; // already encrypted (from the registration form)
  phoneHash?: string | null; // to block a second account with the same number
  address?: string | null; // already encrypted (from the registration form)
}

// Which detail already belongs to another account (sent as the error's details)
type Duplicate = { duplicate: "email" | "phone" };

// Creates the user with an empty school profile and the default Settings categories.
// Runs in a transaction so two sign-ups with the same email or mobile number can't both succeed.
// Name, email, job title and school are encrypted (see profile.user).
export async function createAccount(account: NewAccount) {
  const userRef = usersCollection.doc();

  await db.runTransaction(async (transaction) => {
    const sameEmail = await Promise.all(emailQueries(account.email).map((query) => transaction.get(query)));
    if (sameEmail.some((snapshot) => !snapshot.empty)) {
      throw new ApiError(409, "An account with this email already exists", { duplicate: "email" } satisfies Duplicate);
    }
    if (account.phoneHash) {
      const samePhone = await transaction.get(usersCollection.where("phoneHash", "==", account.phoneHash).limit(1));
      if (!samePhone.empty) {
        throw new ApiError(409, "An account with this mobile number already exists", { duplicate: "phone" } satisfies Duplicate);
      }
    }

    const role = account.accessRole === "dev" ? "Developer" : "School Counselor Associate";
    const user: UserDoc = {
      ...encodeNewUser({ name: account.name, email: account.email, role, school: EMPTY_SCHOOL }),
      password: account.password,
      firebaseUid: account.firebaseUid,
      emailVerifiedAt: account.emailVerifiedAt,
      accessRoles: [account.accessRole ?? DEFAULT_ACCESS_ROLE],
      phone: account.phone ?? null,
      phoneHash: account.phoneHash ?? null,
      address: account.address ?? null,
      tokenVersion: 0,
      createdAt: nowIso(),
    };
    transaction.create(userRef, user);

    const categories = userCollection(userRef.id, "categories");
    DEFAULT_CATEGORIES.forEach((category, index) => {
      // Lists show newest first, so earlier defaults get later times to keep the default order
      const createdAt = new Date(Date.now() - index).toISOString();
      transaction.create(categories.doc(), toCategoryDoc(category, createdAt));
    });
  });

  return { id: userRef.id, email: account.email, name: account.name };
}

// Login response: our JWT plus the { user, school } profile the frontend stores.
// `how` is saved in the activity log (password, google, email-link, invitation).
async function buildSession(userId: string, how: string) {
  const token = signAccessToken(userId, await getTokenVersion(userId));
  await recordAudit(userId, "sign-in", "account", how);
  return { token, profile: await profileService.getProfile(userId) };
}

const isDuplicate = (error: unknown, field: Duplicate["duplicate"]) =>
  error instanceof ApiError && (error.details as Duplicate | undefined)?.duplicate === field;

// The response is the same whether or not the email is new, so the sign-up page never reveals
// which emails are registered (the owner learns what happened by email). A mobile number that
// another account uses is shown as an error so the user can fix it right away.
export async function register(input: RegisterInput) {
  const existing = await findUserByEmail(input.email);
  if (existing) {
    // Unconfirmed account: send the confirmation again. Confirmed: tell the owner they already have one.
    const send = existing.raw.emailVerifiedAt
      ? sendEmail({ to: existing.email, ...accountExistsEmail(existing.name, existing.email) })
      : sendTokenEmail(existing, "VERIFY_EMAIL");
    await send.catch((error: unknown) => console.error("Sign-up email failed:", error));
    return { email: input.email };
  }

  try {
    const user = await createAccount({
      name: input.fullName,
      email: input.email,
      password: await hashPassword(input.password),
      firebaseUid: null,
      emailVerifiedAt: null,
      phone: encrypt(input.phone),
      phoneHash: phoneHash(input.phone),
      address: encryptAddress(input.address),
    });
    // The account already exists, so a failed email shouldn't fail sign-up.
    // The "Check your email" page has a Resend button that tries again.
    await sendTokenEmail(user, "VERIFY_EMAIL").catch((error: unknown) => {
      console.error("Confirmation email failed after registration:", error);
    });
  } catch (error) {
    if (isDuplicate(error, "email")) return { email: input.email }; // signed up twice at the same moment
    if (isDuplicate(error, "phone")) {
      throw new ApiError(409, "This mobile number is already used by another account. Please use a different number.");
    }
    throw error;
  }
  return { email: input.email };
}

// "j***@school.edu": shows where the code went without revealing the whole address
function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 1)}${"*".repeat(Math.max(local.length - 1, 3))}@${domain}`;
}

// Step 1 of password sign-in: check the password, then email a 6-digit code (two-factor authentication).
// Returns { challenge } for step 2; the session is only created by verifyLoginCode.
export async function login(input: LoginInput) {
  const user = await findUserByEmail(input.email);

  // Same message for unknown email and wrong password, so emails can't be guessed.
  const valid = user?.raw.password ? await comparePassword(input.password, user.raw.password) : false;
  if (!user || !valid) throw new ApiError(401, "Invalid email or password");
  if (!user.raw.emailVerifiedAt) throw new ApiError(403, "Please confirm your email before signing in");

  // This browser entered a code in the last day: skip the code step
  const device = input.deviceToken ? verifyDeviceToken(input.deviceToken) : null;
  if (device?.userId === user.id && device.tokenVersion === (await getTokenVersion(user.id))) {
    return buildSession(user.id, "password");
  }

  const challenge = await sendLoginCode(user);
  return { codeRequired: true, challenge, email: maskEmail(user.email) };
}

// Step 2 of password sign-in. Also returns a device token so this browser can skip the code for 1 day.
export async function verifyLoginCode({ challenge, code }: LoginCodeInput) {
  const userId = await checkLoginCode(challenge, code);
  const session = await buildSession(userId, "password");
  return { ...session, deviceToken: signDeviceToken(userId, await getTokenVersion(userId)) };
}

// A new code for the same sign-in (the old one stops working)
export async function resendLoginCode(challenge: string) {
  const user = await getUserInfo(await getChallengeUserId(challenge));
  if (!user) throw new ApiError(400, "Please sign in again.");
  await sendLoginCode(user, challenge);
  return { sent: true };
}

// Google sign-in happens in the browser with Firebase Auth (Google handles its own 2-step verification).
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
  if (!byUid.empty) return buildSession(byUid.docs[0].id, "google");

  const existing = await findUserByEmail(email);
  if (existing) {
    // First Google sign-in for an email/password account: link it.
    await usersCollection.doc(existing.id).update({
      firebaseUid: decoded.uid,
      emailVerifiedAt: existing.raw.emailVerifiedAt ?? nowIso(),
    });
    return buildSession(existing.id, "google");
  }

  const googleName = typeof decoded.name === "string" ? decoded.name.slice(0, 100) : "";
  const user = await createAccount({
    name: googleName || email,
    email,
    password: null,
    firebaseUid: decoded.uid,
    emailVerifiedAt: nowIso(),
  });
  return buildSession(user.id, "google");
}

// Opening the private link proves the user owns the email, so we sign them in right away.
export async function verifyEmail(token: string) {
  const userId = await consumeToken(token, "VERIFY_EMAIL");
  await usersCollection.doc(userId).update({ emailVerifiedAt: nowIso() });
  return buildSession(userId, "email-link");
}

// Always succeeds so the response doesn't reveal whether the email is registered.
export async function resendConfirmation(email: string) {
  const user = await findUserByEmail(email);
  if (user && !user.raw.emailVerifiedAt) await sendTokenEmail(user, "VERIFY_EMAIL");
  return { email };
}

// Always succeeds so the response doesn't reveal whether the email is registered.
export async function forgotPassword(email: string) {
  const user = await findUserByEmail(email);
  if (user) await sendTokenEmail(user, "RESET_PASSWORD");
  return { email };
}

// A new password signs out every device (someone else may know the old one)
export async function resetPassword({ token, password }: ResetPasswordInput) {
  const userId = await consumeToken(token, "RESET_PASSWORD");
  const ref = usersCollection.doc(userId);
  const user = (await ref.get()).data() as UserDoc;

  // Opening the emailed link also proves the user owns the email.
  await ref.update({ password: await hashPassword(password), emailVerifiedAt: user.emailVerifiedAt ?? nowIso() });
  await revokeAllSessions(userId);
  await recordAudit(userId, "password-reset", "account", userId);
}

// Sign out this device: its token stops working right away
export async function logout(session: TokenPayload) {
  await revokeSession(session);
  await recordAudit(session.userId, "sign-out", "account", session.userId);
}

// Sign out every device, including this one
export async function logoutEverywhere(userId: string) {
  await revokeAllSessions(userId);
  await recordAudit(userId, "sign-out-all", "account", userId);
}

// The invited email, and whether it already has an account (then the page shows "Accept invitation")
export async function getInvitation(token: string) {
  const { email } = await peekInvitation(token);
  return { email, hasAccount: Boolean(await findUserByEmail(email)) };
}

// Creates a developer account from an invitation. The invitation proves the email, so it is verified.
// The invitation is used up only after the account exists, so a failed sign-up can be retried.
export async function registerDeveloper({ token, fullName, password }: RegisterDeveloperInput) {
  const { email } = await peekInvitation(token);
  if (await findUserByEmail(email)) {
    throw new ApiError(409, "This email already has an account. Use Accept invitation instead.");
  }
  const user = await createAccount({
    name: fullName,
    email,
    password: await hashPassword(password),
    firebaseUid: null,
    emailVerifiedAt: nowIso(),
    accessRole: "dev",
  });
  await consumeInvitation(token);
  await recordAudit(user.id, "role-added", "account", "dev");
  return buildSession(user.id, "invitation");
}

// An existing account accepts a developer invitation. Opening the private link proves the invited
// person owns the email, so a developer can never give the role to someone without their consent.
export async function acceptInvitation(token: string) {
  const { email } = await peekInvitation(token);
  const user = await findUserByEmail(email);
  if (!user) throw new ApiError(400, "This email has no account yet. Create your developer account instead.");

  if (!hasRole(user.raw, "dev")) {
    await usersCollection.doc(user.id).update({ accessRoles: withRole(user.raw, "dev") });
    await recordAudit(user.id, "role-added", "account", "dev");
  }
  await consumeInvitation(token);
  return { email };
}
