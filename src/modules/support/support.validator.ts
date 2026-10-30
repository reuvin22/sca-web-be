import { z } from "zod";
import { requiredText } from "../../utils/schema";

export const REPORT_TYPES = ["bug", "feature"] as const;
export const REPORT_STATUSES = ["todo", "in-progress", "done"] as const; // Kanban columns

// Sent as multipart/form-data (text fields + optional "media" files for bugs).
// Severity is only sent for bug reports.
export const supportRequestSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("bug"),
    subject: requiredText(200),
    description: requiredText(5000),
    severity: z.enum(["low", "medium", "high", "critical"]),
  }),
  z.object({ type: z.literal("feature"), subject: requiredText(200), description: requiredText(5000) }),
]);

// ?type=bug | feature
export const boardQuerySchema = z.object({ type: z.enum(REPORT_TYPES) });

// Move to another column and/or assign (null = unassigned)
export const updateReportSchema = z
  .object({
    status: z.enum(REPORT_STATUSES).optional(),
    assigneeId: z.string().regex(/^[A-Za-z0-9]{20}$/, "Invalid user").nullable().optional(),
  })
  .refine((data) => data.status !== undefined || data.assigneeId !== undefined, "Nothing to update");

export const attachmentParamsSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9]{20}$/, "Invalid id"),
  index: z.coerce.number().int().min(0).max(20),
});
