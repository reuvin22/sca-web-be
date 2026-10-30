import { db } from "../src/config/firebase";
import { encryptCase, decryptCase, isLegacyCase } from "../src/modules/case/case.crypto";
import type { CaseDoc, LegacyCaseDoc } from "../src/modules/case/case.types";

// One-time: re-saves cases from before full encryption (plain fields) in the encrypted shape.
// Safe to run more than once: already-encrypted cases are skipped.
// Run with: npm run db:encrypt-cases
const BATCH_SIZE = 400; // Firestore allows 500 writes per batch

async function main() {
  const snapshot = await db.collectionGroup("cases").get();
  const legacy = snapshot.docs.filter((doc) => isLegacyCase(doc.data() as CaseDoc | LegacyCaseDoc));
  console.log(`Cases: ${snapshot.size} total, ${legacy.length} to encrypt.`);

  for (let i = 0; i < legacy.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const doc of legacy.slice(i, i + BATCH_SIZE)) {
      const raw = doc.data() as LegacyCaseDoc;
      const encrypted: CaseDoc = {
        caseNumber: raw.caseNumber,
        data: encryptCase(decryptCase(raw)),
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      };
      batch.set(doc.ref, encrypted); // replaces the document, removing the plain fields
    }
    await batch.commit();
    console.log(`Encrypted ${Math.min(i + BATCH_SIZE, legacy.length)} of ${legacy.length}`);
  }
  console.log("Done.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => process.exit(0));
