import type { z } from "zod";
import type { CASE_STATUSES, caseQuerySchema, caseSchema } from "./case.validator";

export type CaseInput = z.infer<typeof caseSchema>;
export type CaseQuery = z.infer<typeof caseQuerySchema>;
export type CaseStatus = (typeof CASE_STATUSES)[number];

// Firestore: users/{userId}/cases/{id}
// All student and case details are one encrypted JSON value (see ENCRYPTED_DATA.md).
export interface CaseDoc {
  caseNumber: string;
  data: string; // AES-256-GCM encrypted CaseInput
  createdAt: string;
  updatedAt: string;
}

// Cases saved before full encryption: plain fields, only remarks encrypted.
// Still readable; scripts/encrypt-all.ts re-saves them in the encrypted shape.
export type LegacyCaseDoc = Omit<CaseInput, "remarks"> & {
  caseNumber: string;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
};
