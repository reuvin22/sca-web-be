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
  accessRole?: AccessRole; // RBAC role; missing on older accounts = sca-1 (see utils/roles)
  readUpdateIds?: string[]; // system updates this user has opened (notifications)
  phone: string | null; // AES-256-GCM encrypted
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
