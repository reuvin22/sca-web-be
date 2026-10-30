import type { z } from "zod";
import type { boardSchema } from "./todo.validator";

export type BoardInput = z.infer<typeof boardSchema>;
