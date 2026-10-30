import type { z } from "zod";
import type { AccessRole } from "../../utils/roles";
import type { updateProfileSchema } from "./profile.validator";

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type School = UpdateProfileInput["school"];

// Firestore: users/{userId}
export interface UserDoc {
  name: string;
  email: string;
  password: string | null; // bcrypt hash. Null for Google-only accounts.
  firebaseUid: string | null; // set when the user signs in with Google
  role: string; // job title shown on the profile (free text)
  accessRoles?: AccessRole[]; // RBAC roles, e.g. ["sca-1", "dev"] (read with rolesOf in utils/roles)
  accessRole?: AccessRole; // older accounts: a single role; missing = sca-1
  readUpdateIds?: string[]; // system updates this user has opened (notifications)
  readNotificationIds?: string[]; // bell notifications marked read, e.g. "overdue-<caseId>" (newest 300 kept)
  phone: string | null; // AES-256-GCM encrypted
  phoneHash?: string | null; // lookup hash of the phone, to block duplicates (see utils/address)
  address?: string | null; // AES-256-GCM encrypted JSON (see utils/address); missing on older accounts
  emailVerifiedAt: string | null;
  school: School;
  photo?: ProfilePhoto | null; // missing on accounts that never uploaded one
  createdAt: string;
}

// Profile picture stored (encrypted) in R2
export interface ProfilePhoto {
  storageKey: string;
  mimeType: string;
  updatedAt: string;
}
