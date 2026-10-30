import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";
import { dateString, optionalFilter, optionalText, requiredText, searchDateQuerySchema } from "../../utils/schema";

export const APPOINTMENT_STATUSES = ["scheduled", "completed", "cancelled", "no-show"] as const;

// Used for both create (POST) and full update (PUT)
export const appointmentSchema = z.object({
  studentName: requiredText(150),
  staff: optionalText(100),
  date: dateString,
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be HH:MM"),
  duration: optionalText(30),
  type: optionalText(100),
  reason: optionalText(100),
  status: z.enum(APPOINTMENT_STATUSES).default("scheduled"),
  reminder: optionalText(30),
  rescheduledFrom: optionalText(50),
  notes: optionalText(2000),
});

// ?search=&from=&to=&status=&staff=&page=&limit=
export const appointmentQuerySchema = paginationQuerySchema.extend({
  ...searchDateQuerySchema.shape,
  status: z
    .union([z.enum(APPOINTMENT_STATUSES), z.literal("")])
    .optional()
    .transform((value) => value || undefined),
  staff: optionalFilter(100),
});
