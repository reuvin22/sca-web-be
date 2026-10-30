import { z } from "zod";
import { decryptJson, encryptJson, lookupHash } from "./encryption";
import { optionalText } from "./schema";

// Philippine address picked from the PSGC lists (region -> province -> city/municipality -> barangay).
// Each place is { code, name }. NCR has no provinces, so `province` can be null.
const place = z.object({
  code: z.string().regex(/^\d{9,10}$/, "Invalid place code"),
  name: z.string().trim().min(1).max(150),
});

export const addressSchema = z.object({
  region: place,
  province: place.nullable().default(null),
  city: place,
  barangay: place,
  street: optionalText(200), // house no., street, subdivision
});

export type Address = z.infer<typeof addressSchema>;

// Mobile number: 09XXXXXXXXX or +639XXXXXXXXX (spaces and dashes allowed)
// Stored as 09XXXXXXXXX whatever the user typed ("+63 917-123-4567" -> "09171234567"),
// so the same number always gives the same duplicate-check hash (see phoneHash)
export const mobileSchema = z
  .string()
  .trim()
  .refine((value) => /^(\+63|0)9\d{9}$/.test(value.replace(/[\s-]/g, "")), "Enter a mobile number like 0917 123 4567")
  .transform((value) => value.replace(/[\s-]/g, "").replace(/^\+63/, "0"));

// Lookup hash of a normalized mobile number: phones are encrypted, so duplicates are found by this
export const phoneHash = (phone: string) => lookupHash(`phone:${phone}`);

// Addresses are personal information, so they are stored encrypted (see ENCRYPTED_DATA.md)
export const encryptAddress = (address: Address) => encryptJson(address);
export const decryptAddress = (stored: string | null | undefined): Address | null => (stored ? decryptJson<Address>(stored) : null);
