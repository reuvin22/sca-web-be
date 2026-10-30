import type { DocumentSnapshot } from "firebase-admin/firestore";
import { recordAudit } from "../../utils/audit";
import { nowIso } from "../../utils/date";
import { decryptOptional, encryptOptional } from "../../utils/encryption";
import { dataOrNotFound, includesText, paginate, userCollection, whereDateRange } from "../../utils/firestore";
import { generateCaseNumber } from "../../utils/token";
import { getCaseStatus } from "./case.status";
import type { CaseDoc, CaseInput, CaseQuery } from "./case.types";

const cases = (userId: string) => userCollection(userId, "cases");

function toCase(doc: DocumentSnapshot) {
  const { createdAt: _createdAt, updatedAt: _updatedAt, remarks, ...fields } = doc.data() as CaseDoc;
  return { id: doc.id, ...fields, remarks: decryptOptional(remarks) };
}

function toCaseFields(input: CaseInput) {
  return { ...input, remarks: encryptOptional(input.remarks), updatedAt: nowIso() };
}

// Newest intake first. The date range runs in Firestore; name search and status run after (see paginate),
// because the status can depend on today's date.
export async function listCases(userId: string, { page, limit, search, from, to, status }: CaseQuery) {
  const firestoreQuery = whereDateRange(cases(userId), "intakeDate", from, to).orderBy("intakeDate", "desc");

  const matches =
    search || status
      ? (item: ReturnType<typeof toCase>) =>
          includesText(item.learnerName, search) && (!status || getCaseStatus(item) === status)
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
  const ref = await cases(userId).add({ ...toCaseFields(input), caseNumber: generateCaseNumber(), createdAt: nowIso() });
  await recordAudit(userId, "create", "case", ref.id);
  return toCase(await ref.get());
}

export async function updateCase(userId: string, id: string, input: CaseInput) {
  const ref = cases(userId).doc(id);
  dataOrNotFound(await ref.get(), "Case");

  await ref.update(toCaseFields(input));
  await recordAudit(userId, "update", "case", id);
  return toCase(await ref.get());
}

export async function deleteCase(userId: string, id: string) {
  const ref = cases(userId).doc(id);
  dataOrNotFound(await ref.get(), "Case");

  await ref.delete();
  await recordAudit(userId, "delete", "case", id);
}
