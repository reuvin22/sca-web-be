import { usersCollection } from "../../utils/firestore";
import { sendInvitationEmail } from "../auth/auth.token.service";
import type { UserDoc } from "../profile/profile.types";

// Developer team: users with accessRole "dev". Only team members can be assigned reports.

// Newest member first (sorted here so the query needs no composite index)
export async function listDevelopers() {
  const snapshot = await usersCollection.where("accessRole", "==", "dev").select("name", "email", "createdAt").get();
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as Pick<UserDoc, "name" | "email" | "createdAt">) }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(({ id, name, email }) => ({ id, name, email }));
}

// Emails a private link to the developer registration page
export async function inviteDeveloper(inviterId: string, email: string) {
  const inviter = (await usersCollection.doc(inviterId).get()).data() as UserDoc;
  await sendInvitationEmail(inviter.name, email);
  return { email };
}
