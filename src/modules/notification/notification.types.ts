import type { z } from "zod";
import type { markReadSchema } from "./notification.validator";

export type MarkReadInput = z.infer<typeof markReadSchema>;
