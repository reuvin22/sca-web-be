import { ApiError } from "../../utils/apiError";
import { usersCollection } from "../../utils/firestore";
import { hasRole } from "../../utils/roles";
import { sendInvitationEmail } from "../auth/auth.token.service";
import type { UserDoc } from "../profile/profile.types";
import { findUserByEmail, getUserInfo, readUser } from "../profile/profile.user";

// Developer team: users with the "dev" role. Only team members can be assigned reports.

type Member = Pick<UserDoc, "name" | "email" | "role" | "school" | "createdAt">;

// Newest member first (sorted here so the query needs no composite index).
// Older accounts keep a single `accessRole`, so both fields are checked; a user found by both is listed once.
// Names and emails are encrypted, so they are decrypted here.
export async function listDevelopers() {
  const fields = ["name", "email", "createdAt"];
  const [byRoles, byOldRole] = await Promise.all([
    usersCollection.where("accessRoles", "array-contains", "dev").select(...fields).get(),
    usersCollection.where("accessRole", "==", "dev").select(...fields).get(),
  ]);
  const members = new Map<string, Member>();
  [...byRoles.docs, ...byOldRole.docs].forEach((doc) => members.set(doc.id, doc.data() as Member));
  return [...members]
    .sort(([, a], [, b]) => b.createdAt.localeCompare(a.createdAt))
    .map(([id, member]) => {
      const { name, email } = readUser(member);
      return { id, name, email };
    });
}

// Emails a private invitation link. A new email gets "create your developer account";
// an existing account gets "accept invitation" and only becomes a developer if the owner accepts.
export async function inviteDeveloper(inviterId: string, email: string) {
  const existing = await findUserByEmail(email);
  if (existing && hasRole(existing.raw, "dev")) throw new ApiError(409, `${email} is already on the team`);

  const inviter = await getUserInfo(inviterId);
  await sendInvitationEmail(inviter?.name ?? "A developer", email, Boolean(existing));
  return { email };
}
