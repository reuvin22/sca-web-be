import type { z } from "zod";
import type { createCategorySchema, updateOptionsSchema } from "./category.validator";

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateOptionsInput = z.infer<typeof updateOptionsSchema>;

// Firestore: users/{userId}/categories/{id}
export interface CategoryDoc {
  name: string;
  options: string[];
  createdAt: string;
}
