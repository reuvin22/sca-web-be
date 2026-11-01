import { usersCollection, userCollection } from "../../utils/firestore";
import { decryptJson, encryptJson } from "../../utils/encryption";
import { nowIso } from "../../utils/date";
import { getUserInfo } from "../profile/profile.user";
import { getCaseStatus } from "./case.status";
import type { CaseInput, CaseStatus } from "./case.types";

// Action history of a case (shown in the case window): what was done and which fields changed.
// Firestore: users/{userId}/cases/{caseId}/history/{id}, each entry encrypted (values can be personal).
// Remarks are confidential, so only "Remarks updated" is kept, never their text.

const LABELS: Record<keyof CaseInput, string> = {
  intakeDate: "Intake Date",
  learnerName: "Name of Learner",
  gradeSection: "Grade & Section",
  concern: "Nature of Concern",
  action: "Action / Service Rendered",
  referredTo: "Referred To / Remarks",
  classification: "Intake Classification",
  followUpDate: "Follow-up Date",
  status: "Status",
  remarks: "Remarks",
};

export interface CaseChange {
  field: keyof CaseInput;
  label: string;
  from?: string; // left out for remarks
  to?: string;
}

interface HistoryEntry {
  action: "created" | "updated";
  by: string; // name of who did it, as it was then
  changes: CaseChange[];
  status: CaseStatus; // the case's status right after this action
}

interface HistoryDoc {
  data: string; // AES-256-GCM encrypted HistoryEntry
  createdAt: string;
}

const history = (userId: string, caseId: string) => userCollection(userId, "cases").doc(caseId).collection("history");

// Fields that changed between the saved case and the new one
function changesBetween(before: CaseInput, after: CaseInput): CaseChange[] {
  return (Object.keys(LABELS) as (keyof CaseInput)[])
    .filter((field) => (before[field] ?? "") !== (after[field] ?? ""))
    .map((field) => {
      if (field === "remarks") return { field, label: LABELS[field] };
      // An empty status means it follows the follow-up date: show the status it really had
      if (field === "status") return { field, label: LABELS[field], from: getCaseStatus(before), to: getCaseStatus(after) };
      return { field, label: LABELS[field], from: before[field] ?? "", to: after[field] ?? "" };
    });
}

const nameOf = async (userId: string) => (await getUserInfo(userId))?.name || "Unknown user";

export async function recordCreated(userId: string, caseId: string, input: CaseInput) {
  const entry: HistoryEntry = { action: "created", by: await nameOf(userId), changes: [], status: getCaseStatus(input) };
  await history(userId, caseId).add({ data: encryptJson(entry), createdAt: nowIso() } satisfies HistoryDoc);
}

// Saving without changing anything adds nothing
export async function recordUpdated(userId: string, caseId: string, before: CaseInput, after: CaseInput) {
  const changes = changesBetween(before, after);
  if (!changes.length) return;
  const entry: HistoryEntry = { action: "updated", by: await nameOf(userId), changes, status: getCaseStatus(after) };
  await history(userId, caseId).add({ data: encryptJson(entry), createdAt: nowIso() } satisfies HistoryDoc);
}

// Newest first. Cases saved before the history existed show their create / update times from the
// activity log (without the field details).
export async function listHistory(userId: string, caseId: string) {
  const [saved, logs, owner] = await Promise.all([
    history(userId, caseId).orderBy("createdAt", "desc").get(),
    usersCollection.doc(userId).collection("auditLogs").where("entityId", "==", caseId).get(),
    nameOf(userId),
  ]);
  const entries = saved.docs.map((doc) => {
    const raw = doc.data() as HistoryDoc;
    const entry = decryptJson<HistoryEntry>(raw.data);
    // Entries saved before names were kept: the account owner made them
    return { id: doc.id, createdAt: raw.createdAt, ...entry, by: entry.by || owner };
  });
  const oldest = entries.at(-1)?.createdAt ?? "9999";
  const earlier = logs.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as { action: string; entity: string; createdAt: string }) }))
    .filter((log) => log.entity === "case" && (log.action === "create" || log.action === "update") && log.createdAt < oldest)
    .map((log) => ({
      id: log.id,
      createdAt: log.createdAt,
      action: log.action === "create" ? ("created" as const) : ("updated" as const),
      by: owner,
      changes: [],
      status: null,
    }));
  return [...entries, ...earlier].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
