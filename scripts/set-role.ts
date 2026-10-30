import { usersCollection } from "../src/utils/firestore";
import { ACCESS_ROLES, type AccessRole } from "../src/utils/roles";

// Sets a user's access role. Use it to make the first developer, or to give someone sca-2 / sca-3.
// Run with: npm run user:role -- someone@school.edu dev
async function main() {
  const [email, role] = process.argv.slice(2);
  if (!email || !ACCESS_ROLES.includes(role as AccessRole)) {
    throw new Error(`Usage: npm run user:role -- <email> <${ACCESS_ROLES.join(" | ")}>`);
  }

  const snapshot = await usersCollection.where("email", "==", email.trim().toLowerCase()).limit(1).get();
  if (snapshot.empty) throw new Error(`No account with the email ${email}. The person must register first.`);

  await snapshot.docs[0].ref.update({ accessRole: role });
  console.log(`${email} is now ${role}. They may need to refresh the page.`);
}

main()
  .catch((error: Error) => {
    console.error(error.message);
    process.exit(1);
  })
  .finally(() => process.exit(0));
