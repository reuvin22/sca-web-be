import type { z } from "zod";
import type { Attachment } from "../../utils/attachments";
import type { ReportType } from "../support/support.types";
import type { createUpdateSchema, mediaParamsSchema } from "./update.validator";

export type CreateUpdateInput = z.infer<typeof createUpdateSchema>;
export type MediaParams = z.infer<typeof mediaParamsSchema>;

// The private part of an update, encrypted as one JSON string (`data`)
export interface UpdateContent {
  title: string; // the report's subject
  contentHtml: string; // sanitized (see update.sanitize)
  media: Attachment[];
  authorName: string;
}

// Firestore: updates/{id}. A system update every other user is notified about.
export interface UpdateDoc {
  reportId: string;
  reportType: ReportType;
  authorId: string;
  publishedAt: string;
  data: string; // AES-256-GCM encrypted JSON: UpdateContent
}

// Saved before full encryption: content in plain fields
export type LegacyUpdateDoc = Omit<UpdateDoc, "data"> & UpdateContent;

// An update with its content decrypted
export type SystemUpdate = Omit<UpdateDoc, "data"> & UpdateContent;
