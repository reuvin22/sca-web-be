import type { z } from "zod";
import type { AccessRole } from "../../utils/roles";
import type { updateProfileSchema } from "./profile.validator";

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type School = UpdateProfileInput["school"];

// Firestore: users/{userId}. Personal details are encrypted (read them with readUser in profile.user.ts).
// Older accounts may still have plain name/email/role/school until `npm run db:encrypt-all`.
export interface UserDoc {
  name: string; // AES-256-GCM encrypted
  email: string; // AES-256-GCM encrypted
  emailHash?: string; // lookup hash of the email, for sign-in and duplicate checks
  password: string | null; // bcrypt hash. Null for Google-only accounts.
  firebaseUid: string | null; // set when the user signs in with Google
  role: string; // job title shown on the profile, AES-256-GCM encrypted
  accessRoles?: AccessRole[]; // RBAC roles, e.g. ["sca-1", "dev"] (read with rolesOf in utils/roles)
  accessRole?: AccessRole; // older accounts: a single role; missing = sca-1
  tokenVersion?: number; // raised by "sign out of all devices" and password resets; older tokens stop working
  revokedSessions?: RevokedSession[]; // signed-out sessions whose tokens have not expired yet
  readUpdateIds?: string[]; // system updates this user has opened (notifications)
  readNotificationIds?: string[]; // bell notifications marked read, e.g. "overdue-<caseId>" (newest 300 kept)
  phone: string | null; // AES-256-GCM encrypted
  phoneHash?: string | null; // lookup hash of the phone, to block duplicates (see utils/address)
  address?: string | null; // AES-256-GCM encrypted JSON (see utils/address); missing on older accounts
  emailVerifiedAt: string | null;
  school: string | School; // AES-256-GCM encrypted JSON (a plain object on older accounts)
  photo?: ProfilePhoto | null; // missing on accounts that never uploaded one
  createdAt: string;
}

export interface RevokedSession {
  sessionId: string;
  expiresAt: number; // milliseconds since 1970; dropped from the list after this
}

// Profile picture stored (encrypted) in R2
export interface ProfilePhoto {
  storageKey: string;
  mimeType: string;
  updatedAt: string;
}
