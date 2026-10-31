import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";
import { optionalFilter } from "../../utils/schema";

// ?search=&page=&limit=
export const documentQuerySchema = paginationQuerySchema.extend({
  search: optionalFilter(100),
});

// Text fields sent with the multipart upload
export const documentFieldsSchema = z.object({
  name: z.string().trim().max(150).default(""),
  draft: z.enum(["true", "false"]).default("false"),
});

// The editable project (the "project" file): page sizes, which original page each one is, and the objects
// added to each page (Fabric canvas objects). Checked when uploaded; objects are kept as they are.
export const projectSchema = z.object({
  version: z.literal(1),
  pages: z
    .array(
      z.object({
        width: z.number().positive().max(20000),
        height: z.number().positive().max(20000),
        source: z.number().int().min(0).nullable(),
      }),
    )
    .min(1)
    .max(500),
  objects: z.array(z.array(z.record(z.string(), z.unknown()))),
});
