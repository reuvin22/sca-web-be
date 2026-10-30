import type { z } from "zod";
import type { inviteSchema } from "./team.validator";

export type InviteInput = z.infer<typeof inviteSchema>;
