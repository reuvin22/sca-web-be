import { z } from "zod";
import { optionalText, requiredText } from "../../utils/schema";

// Same shape the frontend keeps in its auth store: { user, school }.
// Every school field is required: new users must fill them before using the system.
export const updateProfileSchema = z.object({
  user: z.object({
    fullName: z.string().trim().min(2).max(100),
    email: z.email().trim().toLowerCase().max(255),
    role: optionalText(100),
    phone: optionalText(30).refine((value) => /^[0-9+\-() ]*$/.test(value), "Phone can only contain digits, spaces, +, - and ()"),
  }),
  school: z.object({
    name: requiredText(200),
    schoolId: requiredText(50),
    region: requiredText(100),
    division: requiredText(100),
    schoolYear: requiredText(20),
    reportingMonth: requiredText(30),
    schoolHead: requiredText(100),
    privacy: requiredText(100),
  }),
});
