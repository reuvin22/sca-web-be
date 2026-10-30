import type { ClientRateLimitInfo, Options, Store } from "express-rate-limit";
import { db } from "../config/firebase";
import { lookupHash } from "./encryption";

// Keeps rate-limit counters in Firestore (rateLimits/{id}) so they survive restarts and Render's
// sleep, and are shared if more than one server runs. Used for the sensitive limits only
// (sign-in, codes, emails, uploads); the high-volume general limits stay in memory.
// The client key (an IP or user id) is stored as a keyed hash, never as plain text.
// Old counters can be removed automatically with a Firestore TTL policy on `expireAt`.
const counters = db.collection("rateLimits");

interface CounterDoc {
  hits: number;
  resetAt: number; // milliseconds since 1970
  expireAt: Date; // for a Firestore TTL policy
}

export class FirestoreRateLimitStore implements Store {
  private windowMs = 60 * 1000;

  constructor(public readonly prefix: string) {}

  init(options: Options) {
    this.windowMs = options.windowMs;
  }

  private ref(key: string) {
    return counters.doc(`${this.prefix}-${lookupHash(`rate:${key}`)}`);
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const ref = this.ref(key);
    return db.runTransaction(async (transaction) => {
      const now = Date.now();
      const current = (await transaction.get(ref)).data() as CounterDoc | undefined;
      const fresh = !current || current.resetAt <= now;
      const counter: CounterDoc = fresh
        ? { hits: 1, resetAt: now + this.windowMs, expireAt: new Date(now + this.windowMs) }
        : { ...current, hits: current.hits + 1 };
      transaction.set(ref, counter);
      return { totalHits: counter.hits, resetTime: new Date(counter.resetAt) };
    });
  }

  async decrement(key: string) {
    const ref = this.ref(key);
    await db.runTransaction(async (transaction) => {
      const current = (await transaction.get(ref)).data() as CounterDoc | undefined;
      if (current && current.hits > 0) transaction.update(ref, { hits: current.hits - 1 });
    });
  }

  async resetKey(key: string) {
    await this.ref(key).delete();
  }
}
