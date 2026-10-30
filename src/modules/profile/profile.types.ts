import type { z } from "zod";
import type { updateProfileSchema } from "./profile.validator";

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type School = UpdateProfileInput["school"];

// Firestore: users/{userId}
export interface UserDoc {
  name: string;
  email: string;
  password: string | null; // bcrypt hash. Null for Google-only accounts.
  firebaseUid: string | null; // set when the user signs in with Google
  role: string;
  phone: string | null; // AES-256-GCM encrypted
  emailVerifiedAt: string | null;
  school: School;
  createdAt: string;
}
