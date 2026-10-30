import type { z } from "zod";
import type { detailFields, studentQuerySchema, studentSchema } from "./student.validator";

export type StudentInput = z.infer<typeof studentSchema>;
export type StudentQuery = z.infer<typeof studentQuerySchema>;
export type StudentDetails = { [K in keyof typeof detailFields]: z.infer<(typeof detailFields)[K]> };

// Firestore: users/{userId}/students/{id}
export interface StudentDoc {
  recordId: string;
  data: string; // AES-256-GCM encrypted JSON: the whole student form (StudentInput)
  createdAt: string;
  updatedAt: string;
}

// Saved before full encryption: filter fields plain, personal details encrypted as `details`
export type LegacyStudentDoc = Omit<StudentInput, keyof StudentDetails> & {
  recordId: string;
  details: string;
  createdAt: string;
  updatedAt: string;
};
