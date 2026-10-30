import { z } from "zod";

// Notification ids as the bell builds them, e.g. "overdue-<caseId>", "appointment-<id>", "update-<id>"
export const markReadSchema = z.object({
  ids: z
    .array(z.string().regex(/^[a-z]+-[A-Za-z0-9]{1,40}$/, "Invalid notification id"))
    .min(1)
    .max(100),
});
