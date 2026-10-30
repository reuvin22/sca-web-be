import type { DocumentData, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { db } from "../src/config/firebase";
import { decryptCase, encryptCase, isLegacyCase } from "../src/modules/case/case.crypto";
import type { CaseDoc, LegacyCaseDoc } from "../src/modules/case/case.types";
import { readAppointment } from "../src/modules/appointment/appointment.service";
import type { LegacyAppointmentDoc } from "../src/modules/appointment/appointment.types";
import { toCategoryDoc } from "../src/modules/category/category.service";
import type { LegacyCategoryDoc } from "../src/modules/category/category.types";
import type { LegacyFileDoc } from "../src/modules/file/file.types";
import type { LegacyStudentDoc } from "../src/modules/student/student.types";
import type { BoardInput } from "../src/modules/todo/todo.types";
import { decryptJson, encryptJson, isSealed } from "../src/utils/encryption";
import type { StudentDetails } from "../src/modules/student/student.types";

// One-time: re-saves records from before full encryption (plain fields) in the encrypted shape:
// { <reference number>, data: <encrypted JSON>, createdAt, updatedAt }.
// Safe to run more than once: records that are already encrypted are skipped.
// Run with: npm run db:encrypt-all   (add -- --dry-run to only count and test the conversion, without saving)
const BATCH_SIZE = 400; // Firestore allows 500 writes per batch
const DRY_RUN = process.argv.includes("--dry-run");

type Convert = (raw: DocumentData) => DocumentData;

const COLLECTIONS: { name: string; isOld: (raw: DocumentData) => boolean; convert: Convert }[] = [
  {
    name: "cases",
    isOld: (raw) => isLegacyCase(raw as CaseDoc | LegacyCaseDoc),
    convert: (raw) => {
      const old = raw as LegacyCaseDoc;
      const doc: CaseDoc = {
        caseNumber: old.caseNumber,
        data: encryptCase(decryptCase(old)),
        createdAt: old.createdAt,
        updatedAt: old.updatedAt,
      };
      return doc;
    },
  },
  {
    name: "students",
    isOld: (raw) => !isSealed(raw),
    convert: (raw) => {
      const { details, recordId, createdAt, updatedAt, ...fields } = raw as LegacyStudentDoc;
      return { recordId, data: encryptJson({ ...fields, ...decryptJson<StudentDetails>(details) }), createdAt, updatedAt };
    },
  },
  {
    name: "appointments",
    isOld: (raw) => !isSealed(raw),
    convert: (raw) => {
      const old = raw as LegacyAppointmentDoc;
      return {
        appointmentId: old.appointmentId,
        data: encryptJson(readAppointment(old)),
        createdAt: old.createdAt,
        updatedAt: old.updatedAt,
      };
    },
  },
  {
    name: "files",
    isOld: (raw) => !isSealed(raw),
    convert: (raw) => {
      const { name, storageKey, mimeType, size, createdAt } = raw as LegacyFileDoc;
      return { data: encryptJson({ name, storageKey, mimeType, size }), createdAt };
    },
  },
  {
    name: "categories",
    isOld: (raw) => !isSealed(raw),
    convert: (raw) => {
      const { name, options, createdAt } = raw as LegacyCategoryDoc;
      return toCategoryDoc({ name, options }, createdAt);
    },
  },
  {
    name: "todo",
    isOld: (raw) => !isSealed(raw),
    convert: (raw) => {
      const { columns, cards } = raw as BoardInput;
      return { data: encryptJson({ columns, cards }) };
    },
  },
];

async function encryptCollection({ name, isOld, convert }: (typeof COLLECTIONS)[number]) {
  const snapshot = await db.collectionGroup(name).get();
  // Only records under users/{id}/... (a top-level collection with the same name is not ours)
  const old = snapshot.docs.filter(
    (doc: QueryDocumentSnapshot) => doc.ref.parent.parent?.parent.id === "users" && isOld(doc.data()),
  );
  console.log(`${name}: ${snapshot.size} total, ${old.length} to encrypt`);
  if (DRY_RUN) {
    old.forEach((doc) => convert(doc.data())); // throws if a record can't be decrypted or converted
    return;
  }

  for (let i = 0; i < old.length; i += BATCH_SIZE) {
    const batch = db.batch();
    // set replaces the whole document, removing the plain fields
    old.slice(i, i + BATCH_SIZE).forEach((doc) => batch.set(doc.ref, convert(doc.data())));
    await batch.commit();
  }
}

async function main() {
  for (const collection of COLLECTIONS) await encryptCollection(collection);
  console.log(DRY_RUN ? "Dry run: nothing was saved." : "Done.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => process.exit(0));
