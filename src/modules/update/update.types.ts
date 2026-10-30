import type { z } from "zod";
import type { Attachment } from "../../utils/attachments";
import type { ReportType } from "../support/support.types";
import type { createUpdateSchema, mediaParamsSchema } from "./update.validator";

export type CreateUpdateInput = z.infer<typeof createUpdateSchema>;
export type MediaParams = z.infer<typeof mediaParamsSchema>;

// Firestore: updates/{id}. A system update every other user is notified about.
export interface UpdateDoc {
  reportId: string;
  reportType: ReportType;
  title: string; // the report's subject
  contentHtml: string; // sanitized (see update.sanitize)
  media: Attachment[];
  authorId: string;
  authorName: string;
  publishedAt: string;
}
