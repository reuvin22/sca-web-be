import { z } from "zod";

// Reusable Zod field types. The frontend sends "" for empty form fields.

// Optional text: missing or "" becomes "".
export const optionalText = (max: number) => z.string().trim().max(max).default("");

// Required text
export const requiredText = (max: number) => z.string().trim().min(1, "Required").max(max);

// "YYYY-MM-DD"
export const dateString = z.iso.date();

// Optional date: missing or "" becomes "".
export const optionalDate = z.union([z.iso.date(), z.literal("")]).default("");

// Shared list filters: search text and a date range. No `to` means a single day.
export const searchDateQuerySchema = z.object({
  search: z.string().trim().max(100).default(""),
  from: optionalDate,
  to: optionalDate,
});

// Optional dropdown filter: "" (nothing selected) means no filter.
export const optionalFilter = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined);

// Firestore auto-generated document id (20 letters/digits)
export const idParamsSchema = z.object({ id: z.string().regex(/^[A-Za-z0-9]{20}$/, "Invalid id") });
export type IdParams = z.infer<typeof idParamsSchema>;
