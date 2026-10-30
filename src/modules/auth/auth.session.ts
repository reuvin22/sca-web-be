import { db } from "../../config/firebase";
import { usersCollection } from "../../utils/firestore";
import type { TokenPayload } from "../../utils/jwt";
import type { RevokedSession, UserDoc } from "../profile/profile.types";

// Server-side session checks for the login token (JWT): a token stops working when its session was
// signed out, or when the user signed out of all devices / reset their password (tokenVersion).
// The user's session state is cached briefly so not every request reads Firestore.

const CACHE_MS = 30 * 1000;
const MAX_REVOKED = 100;

interface SessionState {
  exists: boolean;
  tokenVersion: number;
  revoked: Set<string>;
  loadedAt: number;
}

const cache = new Map<string, SessionState>();

async function loadState(userId: string): Promise<SessionState> {
  const cached = cache.get(userId);
  if (cached && Date.now() - cached.loadedAt < CACHE_MS) return cached;

  const doc = await usersCollection.doc(userId).get();
  const user = doc.data() as Pick<UserDoc, "tokenVersion" | "revokedSessions"> | undefined;
  const state: SessionState = {
    exists: doc.exists,
    tokenVersion: user?.tokenVersion ?? 0,
    revoked: new Set((user?.revokedSessions ?? []).map((session) => session.sessionId)),
    loadedAt: Date.now(),
  };
  cache.set(userId, state);
  return state;
}

// False when the account is gone, the session was signed out, or the token is from an older version
export async function isSessionActive({ userId, sessionId, tokenVersion }: TokenPayload) {
  const state = await loadState(userId);
  return state.exists && state.tokenVersion === tokenVersion && !state.revoked.has(sessionId);
}

export async function getTokenVersion(userId: string) {
  return (await loadState(userId)).tokenVersion;
}

// Signs out one session (this device). Expired entries are dropped so the list stays small.
export async function revokeSession({ userId, sessionId, expiresAt }: TokenPayload) {
  const ref = usersCollection.doc(userId);
  await db.runTransaction(async (transaction) => {
    const user = (await transaction.get(ref)).data() as UserDoc | undefined;
    if (!user) return;
    const active = (user.revokedSessions ?? []).filter((session) => session.expiresAt > Date.now());
    const revokedSessions: RevokedSession[] = [...active, { sessionId, expiresAt }].slice(-MAX_REVOKED);
    transaction.update(ref, { revokedSessions });
  });
  cache.delete(userId);
}

// Signs out every device: tokens made before this stop working
export async function revokeAllSessions(userId: string) {
  const ref = usersCollection.doc(userId);
  await db.runTransaction(async (transaction) => {
    const user = (await transaction.get(ref)).data() as UserDoc | undefined;
    if (!user) return;
    transaction.update(ref, { tokenVersion: (user.tokenVersion ?? 0) + 1, revokedSessions: [] });
  });
  cache.delete(userId);
}
