import type { RequestHandler } from "express";
import { getCache, setCache } from "../utils/cache";

// Caches successful GET responses. The key includes the user and the full URL, so page/limit/filters are part of it.
// Example key: "categories:<userId>:/api/v1/categories?page=2&limit=15"
// Clear it with invalidateCache(`${prefix}:${userId}`) after create/update/delete.
export function cacheResponse(prefix: string): RequestHandler {
  return (req, res, next) => {
    const key = `${prefix}:${req.user?.id ?? "public"}:${req.originalUrl}`;

    const cached = getCache(key);
    if (cached) {
      res.json(cached);
      return;
    }

    // Save the response body to cache when the controller sends it.
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode < 400) setCache(key, body);
      return originalJson(body);
    };

    next();
  };
}
