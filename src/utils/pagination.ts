import { z } from "zod";

export const MAX_PAGE_SIZE = 15;

// Reusable query validator: ?page=1&limit=15. Any limit above 15 is capped at 15.
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .default(MAX_PAGE_SIZE)
    .transform((limit) => Math.min(limit, MAX_PAGE_SIZE)),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Converts page/limit into how many items to skip and take.
export function toSkipTake({ page, limit }: PaginationQuery) {
  return { skip: (page - 1) * limit, take: limit };
}

export function buildPaginationMeta({ page, limit }: PaginationQuery, total: number): PaginationMeta {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}

// One page of a list that was already filtered and sorted in code: { items, pagination }
export function paginateArray<T>(items: T[], pagination: PaginationQuery) {
  const { skip, take } = toSkipTake(pagination);
  return { items: items.slice(skip, skip + take), pagination: buildPaginationMeta(pagination, items.length) };
}
