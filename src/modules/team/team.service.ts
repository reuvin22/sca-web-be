import { usersCollection } from "../../utils/firestore";
import { sendInvitationEmail } from "../auth/auth.token.service";
import type { UserDoc } from "../profile/profile.types";

// Developer team: users with accessRole "dev". Only team members can be assigned reports.

export async function listDevelopers() {
  const snapshot = await usersCollection.where("accessRole", "==", "dev").select("name", "email").get();
  return snapshot.docs.map((doc) => {
    const { name, email } = doc.data() as Pick<UserDoc, "name" | "email">;
    return { id: doc.id, name, email };
  });
}

// Emails a private link to the developer registration page
export async function inviteDeveloper(inviterId: string, email: string) {
  const inviter = (await usersCollection.doc(inviterId).get()).data() as UserDoc;
  await sendInvitationEmail(inviter.name, email);
  return { email };
}
