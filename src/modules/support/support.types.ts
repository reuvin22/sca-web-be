import type { z } from "zod";
import type { Attachment } from "../../utils/attachments";
import type {
  REPORT_STATUSES,
  REPORT_TYPES,
  REVIEW_STATUSES,
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
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

// The private part of a report, encrypted as one JSON string (`data`)
export interface ReportContent {
  subject: string;
  description: string;
  severity: string | null; // bugs only
  reporter: { name: string; email: string };
  attachments: Attachment[]; // images/videos, bugs only
}

// Firestore: supportRequests/{id}. One shared collection so developers can see every report.
// Only ids, statuses, votes and times are plain (the board and voting need them).
export interface SupportRequestDoc {
  type: ReportType;
  status: ReportStatus;
  assigneeId: string | null; // a developer
  reporterId: string;
  updateId: string | null; // the published system update, once implemented
  doneAt?: string; // when it was last moved to Done (Updates page order); missing on older reports
  // Feature requests only (missing on older ones = under review, no votes)
  review?: ReviewStatus;
  voterIds?: string[]; // users who voted (one vote each, approved requests only)
  votes?: number; // voterIds.length, kept for sorting
  data: string; // AES-256-GCM encrypted JSON: ReportContent
  createdAt: string;
  updatedAt: string;
}

// Saved before full encryption: content in plain fields
export type LegacySupportRequestDoc = Omit<SupportRequestDoc, "data" | "reporterId"> &
  Omit<ReportContent, "reporter"> & { reporter: { userId: string; name: string; email: string } };

// A report with its content decrypted (what the services work with)
export type SupportRequest = Omit<SupportRequestDoc, "data"> & ReportContent;
