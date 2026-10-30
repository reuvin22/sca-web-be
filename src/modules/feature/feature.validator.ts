import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";
import { REPORT_STATUSES, REVIEW_STATUSES } from "../support/support.validator";

// ?status=all|approved|under-review|rejected&progress=todo|in-progress|done&search=&page=&limit=
// "all" = approved + under review (rejected requests are only shown with their own filter)
// `progress` narrows by the developer board column: todo = In Queue, in-progress, done ("" = any)
export const featureQuerySchema = paginationQuerySchema.extend({
  status: z.enum(["all", ...REVIEW_STATUSES]).default("approved"),
  progress: z
    .union([z.enum(REPORT_STATUSES), z.literal("")])
    .optional()
    .transform((value) => value || undefined),
  search: z.string().trim().max(100).default(""),
});

// ?page=&limit= for "your requests"
export const myFeaturesQuerySchema = paginationQuerySchema;
