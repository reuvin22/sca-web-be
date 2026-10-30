import { z } from "zod";
import { optionalText } from "../../utils/schema";

// Same shape the frontend keeps in its auth store: { user, school }
export const updateProfileSchema = z.object({
  user: z.object({
    fullName: z.string().trim().min(2).max(100),
    email: z.email().trim().toLowerCase().max(255),
    role: optionalText(100),
    phone: optionalText(30).refine((value) => /^[0-9+\-() ]*$/.test(value), "Phone can only contain digits, spaces, +, - and ()"),
  }),
  school: z.object({
    name: z.string().trim().min(1, "School name is required").max(200),
    schoolId: optionalText(50),
    region: optionalText(100),
    division: optionalText(100),
    schoolYear: optionalText(20),
    reportingMonth: optionalText(30),
    schoolHead: optionalText(100),
    privacy: optionalText(100),
  }),
});
