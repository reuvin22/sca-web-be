import { db } from "../../config/firebase";
import { usersCollection } from "../../utils/firestore";
import type { UserDoc } from "../profile/profile.types";

// Read notifications are saved per user so they stay read after a reload and on other devices
const MAX_READ_IDS = 300; // keep the newest ones so the list can't grow forever

export async function markRead(userId: string, ids: string[]) {
  const ref = usersCollection.doc(userId);
  await db.runTransaction(async (transaction) => {
    const user = (await transaction.get(ref)).data() as UserDoc;
    const current = user.readNotificationIds ?? [];
    const merged = [...current.filter((id) => !ids.includes(id)), ...ids].slice(-MAX_READ_IDS);
    transaction.update(ref, { readNotificationIds: merged });
  });
  return { read: ids.length };
}

export async function getReadIds(userId: string): Promise<string[]> {
  const user = (await usersCollection.doc(userId).get()).data() as UserDoc | undefined;
  return user?.readNotificationIds ?? [];
}
