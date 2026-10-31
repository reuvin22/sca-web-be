import type { z } from "zod";
import type { documentQuerySchema, projectSchema } from "./document.validator";

export type DocumentQuery = z.infer<typeof documentQuerySchema>;
export type DocumentProject = z.infer<typeof projectSchema>;

// What the list shows, plus where the files are in R2. Saved encrypted as one JSON value.
export interface DocumentInfo {
  name: string;
  draft: boolean; // left before it was saved (kept automatically)
  pageCount: number;
  projectKey: string; // R2: the editable project (pages and everything added to them), encrypted
  sourceKey: string | null; // R2: the original PDF it was made from, encrypted (null for blank documents)
}

// Firestore: users/{userId}/documents/{id}
export interface DocumentDoc {
  data: string; // AES-256-GCM encrypted JSON (DocumentInfo)
  createdAt: string;
  updatedAt: string;
}
