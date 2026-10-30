import { z } from "zod";

const option = z.string().trim().min(1).max(150);

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(100),
});

// Replaces the whole options list (the frontend adds/removes one option at a time)
export const updateOptionsSchema = z.object({
  options: z
    .array(option)
    .max(200)
    .refine((options) => new Set(options).size === options.length, "Options must be unique"),
});
