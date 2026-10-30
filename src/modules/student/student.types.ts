import type { z } from "zod";
import type { detailFields, studentQuerySchema, studentSchema } from "./student.validator";

export type StudentInput = z.infer<typeof studentSchema>;
export type StudentQuery = z.infer<typeof studentQuerySchema>;
export type StudentDetails = { [K in keyof typeof detailFields]: z.infer<(typeof detailFields)[K]> };

// Firestore: users/{userId}/students/{id}
// Fields used for filters are plain; personal details are one encrypted JSON string.
export type StudentDoc = Omit<StudentInput, keyof StudentDetails> & {
  recordId: string;
  details: string; // AES-256-GCM encrypted JSON
  createdAt: string;
  updatedAt: string;
};
