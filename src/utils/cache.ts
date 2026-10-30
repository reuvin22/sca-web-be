import { env } from "../config/env";

// Simple in-memory cache with expiry. It lives inside this server process,
// so it is cleared on restart and not shared between multiple server instances.
const store = new Map<string, { value: unknown; expiresAt: number }>();

export function getCache<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setCache(key: string, value: unknown, ttlSeconds = env.CACHE_TTL_SECONDS) {
  store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

// Deletes every key that starts with the prefix. Call this after create/update/delete.
export function invalidateCache(prefix: string) {
  for (const key of store.keys()) {
    if (key.startsWith(`${prefix}:`)) store.delete(key);
  }
}
