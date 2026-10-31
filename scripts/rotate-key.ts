import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import type { DocumentData, DocumentReference } from "firebase-admin/firestore";
import { env } from "../src/config/env";
import { db } from "../src/config/firebase";
import { R2_BUCKET, r2 } from "../src/config/r2";
import { emailHash, readUser } from "../src/modules/profile/profile.user";
import type { UserDoc } from "../src/modules/profile/profile.types";
import { phoneHash } from "../src/utils/address";
import { decrypt, encrypt, isCipherText, readText } from "../src/utils/encryption";
import { readEncryptedObject, saveEncryptedObject } from "../src/utils/storage";

// Encryption key rotation: re-encrypts every encrypted value and file with the new key.
//
// 1. Create a new key:  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
// 2. Set ENCRYPTION_KEY_PREVIOUS = the old key and ENCRYPTION_KEY = the new key (in .env AND on Render),
//    then deploy. The app now writes with the new key and still reads data made with the old one.
// 3. Run: npm run db:rotate-key   (add -- --dry-run to only count)
// 4. When it says "Done", remove ENCRYPTION_KEY_PREVIOUS everywhere and keep an offline backup of the new key.
//
// Safe to run again: values already using the new key are simply re-encrypted.
const DRY_RUN = process.argv.includes("--dry-run");
const BATCH_SIZE = 400;

const USER_COLLECTIONS = ["students", "cases", "appointments", "files", "categories", "todo", "forms"];
const TOP_COLLECTIONS = ["supportRequests", "updates", "authTokens"];

// Every encrypted string anywhere in the value, re-encrypted with the current key
function reEncrypt(value: unknown): unknown {
  if (isCipherText(value)) return encrypt(decrypt(value));
  if (Array.isArray(value)) return value.map(reEncrypt);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(Object.entries(value).map(([key, field]) => [key, reEncrypt(field)]));
  }
  return value;
}

// Lookup hashes depend on the key too, so they are made again from the decrypted values
function withNewHashes(path: string, data: DocumentData): DocumentData {
  if (path.startsWith("users/") && path.split("/").length === 2) {
    const user = data as UserDoc;
    const phone = readText(user.phone);
    return { ...data, emailHash: emailHash(readUser(user).email), phoneHash: phone ? phoneHash(phone) : null };
  }
  if (path.startsWith("authTokens/") && typeof data.email === "string") {
    return { ...data, emailHash: emailHash(readText(data.email as string)) };
  }
  return data;
}

async function rewrite(refs: { ref: DocumentReference; data: DocumentData }[], label: string) {
  console.log(`${label}: ${refs.length} documents`);
  if (DRY_RUN) return;
  for (let i = 0; i < refs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    refs.slice(i, i + BATCH_SIZE).forEach(({ ref, data }) => {
      batch.set(ref, withNewHashes(ref.path, reEncrypt(data) as DocumentData));
    });
    await batch.commit();
  }
}

async function rotateFirestore() {
  const users = await db.collection("users").get();
  await rewrite(users.docs.map((doc) => ({ ref: doc.ref, data: doc.data() })), "users");

  for (const name of USER_COLLECTIONS) {
    const snapshot = await db.collectionGroup(name).get();
    const docs = snapshot.docs.filter((doc) => doc.ref.parent.parent?.parent.id === "users");
    await rewrite(docs.map((doc) => ({ ref: doc.ref, data: doc.data() })), name);
  }
  // Answers from public form links: users/{id}/forms/{id}/responses/{id}
  const answers = (await db.collectionGroup("responses").get()).docs.filter((doc) => doc.ref.parent.parent?.parent.id === "forms");
  await rewrite(answers.map((doc) => ({ ref: doc.ref, data: doc.data() })), "form responses");
  for (const name of TOP_COLLECTIONS) {
    const snapshot = await db.collection(name).get();
    // Sign-in codes last 10 minutes; they are simply removed (their hash used the old key)
    const docs = snapshot.docs.filter((doc) => doc.data().type !== "LOGIN_CODE");
    await rewrite(docs.map((doc) => ({ ref: doc.ref, data: doc.data() })), name);
  }

  // Rate-limit counters are keyed by a hash of the old key; starting them over is harmless
  const counters = await db.collection("rateLimits").get();
  const codes = await db.collection("authTokens").where("type", "==", "LOGIN_CODE").get();
  console.log(`rateLimits + sign-in codes: ${counters.size + codes.size} removed`);
  if (!DRY_RUN) await Promise.all([...counters.docs, ...codes.docs].map((doc) => doc.ref.delete()));
}

// Every file in R2: download, decrypt (old or new key), upload encrypted with the new key
async function rotateFiles() {
  let token: string | undefined;
  let count = 0;
  do {
    const page = await r2.send(new ListObjectsV2Command({ Bucket: R2_BUCKET, ContinuationToken: token }));
    for (const object of page.Contents ?? []) {
      if (!object.Key) continue;
      count += 1;
      if (!DRY_RUN) await saveEncryptedObject(object.Key, await readEncryptedObject(object.Key));
    }
    token = page.NextContinuationToken;
  } while (token);
  console.log(`R2 files: ${count}`);
}

async function main() {
  if (!env.ENCRYPTION_KEY_PREVIOUS) {
    throw new Error("Set ENCRYPTION_KEY_PREVIOUS (the old key) and ENCRYPTION_KEY (the new key) first. See the steps in this file.");
  }
  if (env.ENCRYPTION_KEY_PREVIOUS.toLowerCase() === env.ENCRYPTION_KEY.toLowerCase()) {
    throw new Error("ENCRYPTION_KEY and ENCRYPTION_KEY_PREVIOUS are the same. Create a new key first.");
  }
  await rotateFirestore();
  await rotateFiles();
  console.log(DRY_RUN ? "Dry run: nothing was saved." : "Done. Remove ENCRYPTION_KEY_PREVIOUS from .env and Render.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => process.exit(0));
