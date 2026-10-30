import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";
import { REVIEW_STATUSES } from "../support/support.validator";

// ?status=all|approved|under-review|rejected&search=&page=&limit=
// "all" = approved + under review (rejected requests are only shown with their own filter)
export const featureQuerySchema = paginationQuerySchema.extend({
  status: z.enum(["all", ...REVIEW_STATUSES]).default("all"),
  search: z.string().trim().max(100).default(""),
});

// ?page=&limit= for "your requests"
export const myFeaturesQuerySchema = paginationQuerySchema;
