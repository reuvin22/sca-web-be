import { usersCollection } from "../src/utils/firestore";
import { ACCESS_ROLES, type AccessRole } from "../src/utils/roles";
import { findUserByEmail } from "../src/modules/profile/profile.user";

// Sets a user's access roles (replaces the old ones). Use it to make the first developer,
// or to give someone sca-2 / sca-3. Separate several roles with commas.
// Run with: npm run user:role -- someone@school.edu sca-1,dev
async function main() {
  const [email, roleList = ""] = process.argv.slice(2);
  const roles = [...new Set(roleList.split(",").map((role) => role.trim()))];
  if (!email || !roles.every((role) => ACCESS_ROLES.includes(role as AccessRole))) {
    throw new Error(`Usage: npm run user:role -- <email> <role[,role]>  (roles: ${ACCESS_ROLES.join(", ")})`);
  }

  // Emails are encrypted, so the account is found by its email hash
  const user = await findUserByEmail(email);
  if (!user) throw new Error(`No account with the email ${email}. The person must register first.`);

  await usersCollection.doc(user.id).update({ accessRoles: roles });
  console.log(`${email} now has: ${roles.join(", ")}. They may need to refresh the page.`);
}

main()
  .catch((error: Error) => {
    console.error(error.message);
    process.exit(1);
  })
  .finally(() => process.exit(0));
