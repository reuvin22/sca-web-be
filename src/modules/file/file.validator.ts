import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";

// ?search=&page=&limit=
export const fileQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(100).default(""),
});
