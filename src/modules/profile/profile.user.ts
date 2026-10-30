import { decryptJson, encrypt, encryptJson, isCipherText, lookupHash, lookupHashes, readText } from "../../utils/encryption";
import { usersCollection } from "../../utils/firestore";
import type { School, UserDoc } from "./profile.types";

// Encrypted personal details on users/{userId}. Every read of a user's name, email,
// job title or school goes through readUser; every write goes through encodeUser.

export interface UserInfo {
  name: string;
  email: string;
  role: string; // job title
  school: School;
}

export const EMPTY_SCHOOL: School = {
  name: "",
  schoolId: "",
  region: "",
  division: "",
  schoolYear: "",
  reportingMonth: "",
  schoolHead: "",
  privacy: "",
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

// Emails are encrypted, so sign-in finds accounts by this hash instead
export const emailHash = (email: string) => lookupHash(`email:${normalizeEmail(email)}`);

function readSchool(school: UserDoc["school"] | undefined): School {
  if (isCipherText(school)) return { ...EMPTY_SCHOOL, ...decryptJson<School>(school) };
  return { ...EMPTY_SCHOOL, ...(typeof school === "object" ? school : {}) };
}

// Decrypted details (older accounts may still have plain values)
export function readUser(raw: Pick<UserDoc, "name" | "email" | "role" | "school">): UserInfo {
  return { name: readText(raw.name), email: readText(raw.email), role: readText(raw.role), school: readSchool(raw.school) };
}

// All encrypted detail fields for a new account
export function encodeNewUser(info: UserInfo) {
  return {
    name: encrypt(info.name),
    email: encrypt(normalizeEmail(info.email)),
    emailHash: emailHash(info.email),
    role: encrypt(info.role),
    school: encryptJson(info.school),
  };
}

// The encrypted fields to save for these details (only the ones given)
export function encodeUser(info: Partial<UserInfo>) {
  return {
    ...(info.name !== undefined && { name: encrypt(info.name) }),
    ...(info.email !== undefined && { email: encrypt(normalizeEmail(info.email)), emailHash: emailHash(info.email) }),
    ...(info.role !== undefined && { role: encrypt(info.role) }),
    ...(info.school !== undefined && { school: encryptJson(info.school) }),
  };
}

// Queries that find the account with this email: by hash (with the current and, during a key
// rotation, the previous key), or by the plain email on older accounts.
export function emailQueries(email: string) {
  const hashes = lookupHashes(`email:${normalizeEmail(email)}`);
  return [usersCollection.where("emailHash", "in", hashes).limit(1), usersCollection.where("email", "==", normalizeEmail(email)).limit(1)];
}

export async function findUserByEmail(email: string) {
  const snapshots = await Promise.all(emailQueries(email).map((query) => query.get()));
  const doc = snapshots.flatMap((snapshot) => snapshot.docs)[0];
  if (!doc) return null;
  const raw = doc.data() as UserDoc;
  return { id: doc.id, raw, ...readUser(raw) };
}

export async function getUserInfo(userId: string) {
  const raw = (await usersCollection.doc(userId).get()).data() as UserDoc | undefined;
  return raw ? { id: userId, raw, ...readUser(raw) } : null;
}
