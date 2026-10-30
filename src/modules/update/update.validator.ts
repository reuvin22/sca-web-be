import { z } from "zod";

const firestoreId = z.string().regex(/^[A-Za-z0-9]{20}$/, "Invalid id");

// Sent as multipart/form-data: the text fields + up to 6 "media" files (images/videos)
export const createUpdateSchema = z.object({
  reportId: firestoreId,
  content: z.string().max(50_000).default(""), // HTML from the editor, sanitized before saving
});

export const mediaParamsSchema = z.object({
  id: firestoreId,
  index: z.coerce.number().int().min(0).max(20),
});
