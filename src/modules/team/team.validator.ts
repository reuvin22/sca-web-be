import { z } from "zod";

export const inviteSchema = z.object({
  email: z.email().trim().toLowerCase().max(255),
});
