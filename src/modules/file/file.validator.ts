import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";
import { FILE_KINDS } from "./file.upload";

const kindNames = Object.keys(FILE_KINDS) as [keyof typeof FILE_KINDS, ...(keyof typeof FILE_KINDS)[]];

// ?search=&kind=&page=&limit=
export const fileQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(100).default(""),
  kind: z
    .union([z.enum(kindNames), z.literal("")])
    .optional()
    .transform((value) => value || undefined),
});
