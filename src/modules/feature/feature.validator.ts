import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";
import { REVIEW_STATUSES } from "../support/support.validator";

// ?status=approved|under-review|rejected&search=&page=&limit=
export const featureQuerySchema = paginationQuerySchema.extend({
  status: z.enum(REVIEW_STATUSES).default("approved"),
  search: z.string().trim().max(100).default(""),
});

// ?page=&limit= for "your requests"
export const myFeaturesQuerySchema = paginationQuerySchema;
