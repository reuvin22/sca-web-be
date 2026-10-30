import type { DocumentSnapshot } from "firebase-admin/firestore";
import { recordAudit } from "../audit/audit.service";
import { nowIso } from "../../utils/date";
import { dataOrNotFound, inDateRange, includesText, paginate, userCollection } from "../../utils/firestore";
import { generateCaseNumber } from "../../utils/token";
import { decryptCase, encryptCase } from "./case.crypto";
import { getCaseStatus } from "./case.status";
import type { CaseDoc, CaseInput, CaseQuery, LegacyCaseDoc } from "./case.types";

const cases = (userId: string) => userCollection(userId, "cases");

// Decrypted case for the signed-in owner (routes check the login; the path checks ownership)
function toCase(doc: DocumentSnapshot) {
  const raw = doc.data() as CaseDoc | LegacyCaseDoc;
  return { id: doc.id, caseNumber: raw.caseNumber, ...decryptCase(raw) };
}

// Newest added first. Case details are encrypted, so name search, intake dates and status
// run after decrypting (see paginate).
export async function listCases(userId: string, { page, limit, search, from, to, status }: CaseQuery) {
  const firestoreQuery = cases(userId).orderBy("createdAt", "desc");

  const matches =
    search || from || status
      ? (item: ReturnType<typeof toCase>) =>
          includesText(item.learnerName, search) &&
          inDateRange(item.intakeDate, from, to) &&
          (!status || getCaseStatus(item) === status)
      : undefined;

  const { items, pagination } = await paginate(firestoreQuery, { page, limit }, toCase, matches);
  return { cases: items, pagination };
}

export async function getCase(userId: string, id: string) {
  const doc = await cases(userId).doc(id).get();
  dataOrNotFound(doc, "Case");
  return toCase(doc);
}

export async function createCase(userId: string, input: CaseInput) {
  const now = nowIso();
  const caseDoc: CaseDoc = { caseNumber: generateCaseNumber(), data: encryptCase(input), createdAt: now, updatedAt: now };
  const ref = await cases(userId).add(caseDoc);
  await recordAudit(userId, "create", "case", ref.id);
  return toCase(await ref.get());
}

export async function updateCase(userId: string, id: string, input: CaseInput) {
  const ref = cases(userId).doc(id);
  const old = dataOrNotFound<CaseDoc | LegacyCaseDoc>(await ref.get(), "Case");

  // set (not update) replaces the whole document, so an old plain-text case loses its plain fields
  const caseDoc: CaseDoc = { caseNumber: old.caseNumber, data: encryptCase(input), createdAt: old.createdAt, updatedAt: nowIso() };
  await ref.set(caseDoc);
  await recordAudit(userId, "update", "case", id);
  return toCase(await ref.get());
}

export async function deleteCase(userId: string, id: string) {
  const ref = cases(userId).doc(id);
  dataOrNotFound(await ref.get(), "Case");

  await ref.delete();
  await recordAudit(userId, "delete", "case", id);
}
