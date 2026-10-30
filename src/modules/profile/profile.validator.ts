import { z } from "zod";
import { addressSchema, mobileSchema } from "../../utils/address";
import { optionalText, requiredText } from "../../utils/schema";

// Same shape the frontend keeps in its auth store: { user, school }.
// Mobile number, address and every school field are required: new users must fill them
// before using the system.
export const updateProfileSchema = z.object({
  user: z.object({
    fullName: z.string().trim().min(2).max(100),
    email: z.email().trim().toLowerCase().max(255),
    role: optionalText(100),
    phone: mobileSchema,
    address: addressSchema,
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
