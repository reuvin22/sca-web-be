import type { z } from "zod";
import type { supportRequestSchema } from "./support.validator";

export type SupportRequestInput = z.infer<typeof supportRequestSchema>;
