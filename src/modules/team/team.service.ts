import { ApiError } from "../../utils/apiError";
import { usersCollection } from "../../utils/firestore";
import { hasRole, withRole } from "../../utils/roles";
import { sendInvitationEmail } from "../auth/auth.token.service";
import type { UserDoc } from "../profile/profile.types";

// Developer team: users with the "dev" role. Only team members can be assigned reports.

type Member = Pick<UserDoc, "name" | "email" | "createdAt">;

// Newest member first (sorted here so the query needs no composite index).
// Older accounts keep a single `accessRole`, so both fields are checked; a user found by both is listed once.
export async function listDevelopers() {
  const fields = ["name", "email", "createdAt"];
  const [byRoles, byOldRole] = await Promise.all([
    usersCollection.where("accessRoles", "array-contains", "dev").select(...fields).get(),
    usersCollection.where("accessRole", "==", "dev").select(...fields).get(),
  ]);
  const members = new Map<string, Member>();
  [...byRoles.docs, ...byOldRole.docs].forEach((doc) => members.set(doc.id, doc.data() as Member));
  return [...members]
    .map(([id, member]) => ({ id, ...member }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(({ id, name, email }) => ({ id, name, email }));
}

// Emails a private link to the developer registration page.
// An email that already has an account just gets the dev role (keeping its other roles, e.g. sca-1 + dev);
// `added` tells the page which happened.
export async function inviteDeveloper(inviterId: string, email: string) {
  const snapshot = await usersCollection.where("email", "==", email).limit(1).get();
  const existing = snapshot.docs[0];
  if (existing) {
    const user = existing.data() as UserDoc;
    if (hasRole(user, "dev")) throw new ApiError(409, `${email} is already on the team`);
    await existing.ref.update({ accessRoles: withRole(user, "dev") });
    return { email, added: true };
  }

  const inviter = (await usersCollection.doc(inviterId).get()).data() as UserDoc;
  await sendInvitationEmail(inviter.name, email);
  return { email, added: false };
}
