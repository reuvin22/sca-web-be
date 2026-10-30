import { z } from "zod";
import { requiredText } from "../../utils/schema";

const subject = requiredText(200);
const description = requiredText(5000);

// Severity is only sent for bug reports
export const supportRequestSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("bug"),
    subject,
    description,
    severity: z.enum(["low", "medium", "high", "critical"]),
  }),
  z.object({ type: z.literal("feature"), subject, description }),
]);
