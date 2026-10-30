import type { DocumentData, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { db } from "../src/config/firebase";
import { decryptCase, encryptCase, isLegacyCase } from "../src/modules/case/case.crypto";
import type { CaseDoc, LegacyCaseDoc } from "../src/modules/case/case.types";
import { readAppointment } from "../src/modules/appointment/appointment.service";
import type { LegacyAppointmentDoc } from "../src/modules/appointment/appointment.types";
import { toCategoryDoc } from "../src/modules/category/category.service";
import type { LegacyCategoryDoc } from "../src/modules/category/category.types";
import type { LegacyFileDoc } from "../src/modules/file/file.types";
import type { UserDoc } from "../src/modules/profile/profile.types";
import { emailHash, encodeNewUser, readUser } from "../src/modules/profile/profile.user";
import type { LegacyStudentDoc, StudentDetails } from "../src/modules/student/student.types";
import { readReport } from "../src/modules/support/support.service";
import type { LegacySupportRequestDoc, ReportContent } from "../src/modules/support/support.types";
import type { BoardInput } from "../src/modules/todo/todo.types";
import type { LegacyUpdateDoc, UpdateContent } from "../src/modules/update/update.types";
import { decryptJson, encrypt, encryptJson, isCipherText, isSealed } from "../src/utils/encryption";

// One-time: re-saves records from before full encryption (plain fields) in the encrypted shape.
// Safe to run more than once: records that are already encrypted are skipped.
// Deploy the backend first (it reads both shapes; older code can't read the new one).
// Run with: npm run db:encrypt-all   (add -- --dry-run to only count and test the conversion, without saving)
const BATCH_SIZE = 400; // Firestore allows 500 writes per batch
const DRY_RUN = process.argv.includes("--dry-run");

interface Collection {
  name: string;
  scope: "user" | "top"; // users/{id}/<name> or a top-level collection
  isOld: (raw: DocumentData) => boolean;
  convert: (raw: DocumentData) => DocumentData;
  mode: "set" | "update"; // set replaces the document (removing plain fields); update changes only some fields
}

// Firestore rejects undefined values
const withoutUndefined = (value: DocumentData) =>
  Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined));

const COLLECTIONS: Collection[] = [
  {
    name: "users",
    scope: "top",
    mode: "update",
    isOld: (raw) => !isCipherText(raw.email) || !isCipherText(raw.name) || !isCipherText(raw.school) || !raw.emailHash,
    convert: (raw) => encodeNewUser(readUser(raw as UserDoc)),
  },
  {
    name: "cases",
    scope: "user",
    mode: "set",
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
    scope: "user",
    mode: "set",
    isOld: (raw) => !isSealed(raw),
    convert: (raw) => {
      const { details, recordId, createdAt, updatedAt, ...fields } = raw as LegacyStudentDoc;
      return { recordId, data: encryptJson({ ...fields, ...decryptJson<StudentDetails>(details) }), createdAt, updatedAt };
    },
  },
  {
    name: "appointments",
    scope: "user",
    mode: "set",
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
    scope: "user",
    mode: "set",
    isOld: (raw) => !isSealed(raw),
    convert: (raw) => {
      const { name, storageKey, mimeType, size, createdAt } = raw as LegacyFileDoc;
      return { data: encryptJson({ name, storageKey, mimeType, size }), createdAt };
    },
  },
  {
    name: "categories",
    scope: "user",
    mode: "set",
    isOld: (raw) => !isSealed(raw),
    convert: (raw) => {
      const { name, options, createdAt } = raw as LegacyCategoryDoc;
      return toCategoryDoc({ name, options }, createdAt);
    },
  },
  {
    name: "todo",
    scope: "user",
    mode: "set",
    isOld: (raw) => !isSealed(raw),
    convert: (raw) => {
      const { columns, cards } = raw as BoardInput;
      return { data: encryptJson({ columns, cards }) };
    },
  },
  {
    name: "supportRequests",
    scope: "top",
    mode: "set",
    isOld: (raw) => !isSealed(raw),
    convert: (raw) => {
      const { subject, description, severity, reporter, attachments, ...fields } = readReport(raw as LegacySupportRequestDoc);
      const content: ReportContent = { subject, description, severity, reporter, attachments };
      return withoutUndefined({ ...fields, data: encryptJson(content) });
    },
  },
  {
    name: "updates",
    scope: "top",
    mode: "set",
    isOld: (raw) => !isSealed(raw),
    convert: (raw) => {
      const { title, contentHtml, media, authorName, ...fields } = raw as LegacyUpdateDoc;
      const content: UpdateContent = { title, contentHtml, media, authorName };
      return { ...fields, data: encryptJson(content) };
    },
  },
  {
    // Developer invitations saved the invited email in plain text
    name: "authTokens",
    scope: "top",
    mode: "update",
    isOld: (raw) => typeof raw.email === "string" && !isCipherText(raw.email),
    convert: (raw) => ({ email: encrypt(raw.email as string), emailHash: emailHash(raw.email as string) }),
  },
];

async function encryptCollection({ name, scope, isOld, convert, mode }: Collection) {
  const snapshot = scope === "top" ? await db.collection(name).get() : await db.collectionGroup(name).get();
  // User collections: only records under users/{id}/... (a top-level collection with the same name is not ours)
  const old = snapshot.docs.filter(
    (doc: QueryDocumentSnapshot) => (scope === "top" || doc.ref.parent.parent?.parent.id === "users") && isOld(doc.data()),
  );
  console.log(`${name}: ${snapshot.size} total, ${old.length} to encrypt`);
  if (DRY_RUN) {
    old.forEach((doc) => convert(doc.data())); // throws if a record can't be decrypted or converted
    return;
  }

  for (let i = 0; i < old.length; i += BATCH_SIZE) {
    const batch = db.batch();
    old.slice(i, i + BATCH_SIZE).forEach((doc) => {
      if (mode === "set") batch.set(doc.ref, convert(doc.data()));
      else batch.update(doc.ref, convert(doc.data()));
    });
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
