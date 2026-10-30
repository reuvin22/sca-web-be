import type { Response } from "express";
import type { PaginationMeta } from "./pagination";

// Every successful response has the same shape: { success, data, pagination? }
export function sendSuccess<T>(res: Response, data: T, statusCode = 200, pagination?: PaginationMeta) {
  return res.status(statusCode).json({ success: true, data, pagination });
}
