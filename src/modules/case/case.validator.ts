import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";
import { dateString, optionalText, requiredText, searchDateQuerySchema } from "../../utils/schema";

// Follow-up status. "" means it is worked out from the follow-up date.
export const CASE_STATUSES = ["overdue", "today", "scheduled", "accomplished"] as const;

// Used for both create (POST) and full update (PUT)
export const caseSchema = z.object({
  intakeDate: dateString,
  learnerName: requiredText(150),
  gradeSection: optionalText(100),
  concern: optionalText(150),
  action: optionalText(150),
  referredTo: optionalText(150),
  classification: optionalText(100),
  followUpDate: dateString,
  status: z.union([z.enum(CASE_STATUSES), z.literal("")]).default(""),
  remarks: optionalText(2000),
});

// ?search=&from=&to=&status=&page=&limit=
export const caseQuerySchema = paginationQuerySchema.extend({
  ...searchDateQuerySchema.shape,
  status: z
    .union([z.enum(CASE_STATUSES), z.literal("")])
    .optional()
    .transform((value) => value || undefined),
});
