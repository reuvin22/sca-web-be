import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";
import { REVIEW_STATUSES } from "../support/support.validator";

// ?status=all|approved|under-review|rejected|done&search=&page=&limit=
// "all" = approved + under review (rejected requests are only shown with their own filter)
// "done" = requests in the Done column of the developer board (any review status)
export const featureQuerySchema = paginationQuerySchema.extend({
  status: z.enum(["all", "done", ...REVIEW_STATUSES]).default("approved"),
  search: z.string().trim().max(100).default(""),
});

// ?page=&limit= for "your requests"
export const myFeaturesQuerySchema = paginationQuerySchema;
