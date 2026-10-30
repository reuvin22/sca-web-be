import type { z } from "zod";
import type { createCategorySchema, updateOptionsSchema } from "./category.validator";

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateOptionsInput = z.infer<typeof updateOptionsSchema>;

export interface Category {
  name: string;
  options: string[];
}

// Firestore: users/{userId}/categories/{id}
export interface CategoryDoc {
  data: string; // AES-256-GCM encrypted JSON: Category
  createdAt: string;
}

// Saved before full encryption (plain fields)
export type LegacyCategoryDoc = Category & { createdAt: string };
