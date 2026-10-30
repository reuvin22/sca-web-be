import type { z } from "zod";
import type { boardSchema } from "./todo.validator";

export type BoardInput = z.infer<typeof boardSchema>;

// Firestore: users/{userId}/todo/board
export interface BoardDoc {
  data: string; // AES-256-GCM encrypted JSON: BoardInput (columns and cards)
}
