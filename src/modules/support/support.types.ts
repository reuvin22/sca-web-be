import type { z } from "zod";
import type { Attachment } from "../../utils/attachments";
import type {
  REPORT_STATUSES,
  REPORT_TYPES,
  attachmentParamsSchema,
  boardQuerySchema,
  supportRequestSchema,
  updateReportSchema,
} from "./support.validator";

export type SupportRequestInput = z.infer<typeof supportRequestSchema>;
export type BoardQuery = z.infer<typeof boardQuerySchema>;
export type UpdateReportInput = z.infer<typeof updateReportSchema>;
export type AttachmentParams = z.infer<typeof attachmentParamsSchema>;
export type ReportType = (typeof REPORT_TYPES)[number];
export type ReportStatus = (typeof REPORT_STATUSES)[number];

// Firestore: supportRequests/{id}. One shared collection so developers can see every report.
export interface SupportRequestDoc {
  type: ReportType;
  subject: string;
  description: string;
  severity: string | null; // bugs only
  status: ReportStatus;
  assigneeId: string | null; // a developer (accessRole "dev")
  reporter: { userId: string; name: string; email: string };
  attachments: Attachment[]; // images/videos, bugs only
  updateId: string | null; // the published system update, once implemented
  doneAt?: string; // when it was last moved to Done (Updates page order); missing on older reports
  createdAt: string;
  updatedAt: string;
}
