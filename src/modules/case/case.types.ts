import type { z } from "zod";
import type { CASE_STATUSES, caseQuerySchema, caseSchema } from "./case.validator";

export type CaseInput = z.infer<typeof caseSchema>;
export type CaseQuery = z.infer<typeof caseQuerySchema>;
export type CaseStatus = (typeof CASE_STATUSES)[number];

// Firestore: users/{userId}/cases/{id}
export type CaseDoc = Omit<CaseInput, "remarks"> & {
  caseNumber: string;
  remarks: string | null; // AES-256-GCM encrypted
  createdAt: string;
  updatedAt: string;
};
