import { z } from "zod";

// ?year=2026&month=10 (one month) or ?year=2026 (the whole year)
export const periodQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

export type PeriodQuery = z.infer<typeof periodQuerySchema>;
