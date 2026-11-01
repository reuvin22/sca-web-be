import type { DocumentSnapshot } from "firebase-admin/firestore";
import { db } from "../../config/firebase";
import { ApiError } from "../../utils/apiError";
import { readAttachment, saveAttachments, toPublicAttachments } from "../../utils/attachments";
import { nowIso } from "../../utils/date";
import { decryptJson, encryptJson, isSealed } from "../../utils/encryption";
import { dataOrNotFound } from "../../utils/firestore";
import { getUserInfo } from "../profile/profile.user";
import * as teamService from "../team/team.service";
import type {
  BoardQuery,
  LegacySupportRequestDoc,
  ReportContent,
  ReportType,
  SupportRequest,
  SupportRequestDoc,
  SupportRequestInput,
  UpdateReportInput,
} from "./support.types";

// Contact Support messages. Any user can send one; developers see them all on a Kanban board.
export const supportCollection = db.collection("supportRequests");

interface UploadedMedia {
  originalname: string;
  size: number;
  buffer: Buffer;
}

type Developer = { id: string; name: string; email: string };

// The report with its encrypted content decrypted (older reports have plain fields)
export function readReport(raw: SupportRequestDoc | LegacySupportRequestDoc): SupportRequest {
  if (isSealed(raw)) {
    const { data, ...fields } = raw;
    return { ...fields, ...decryptJson<ReportContent>(data) };
  }
  const { reporter, ...fields } = raw;
  return { ...fields, reporterId: reporter.userId, reporter: { name: reporter.name, email: reporter.email } };
}

const loadReport = (doc: DocumentSnapshot) => readReport(doc.data() as SupportRequestDoc | LegacySupportRequestDoc);

// Safe for the browser: attachments without storage keys, assignee as { id, name }
function toReport(doc: DocumentSnapshot, team: Developer[]) {
  // Who voted stays on the server; only the vote count is sent
  const { attachments, assigneeId, voterIds: _voterIds, ...report } = loadReport(doc);
  const assignee = team.find((member) => member.id === assigneeId);
  return {
    id: doc.id,
    ...report,
    assignee: assignee ? { id: assignee.id, name: assignee.name } : null,
    attachments: toPublicAttachments(attachments),
  };
}

// Bug reports and feature requests can both include images and videos (screenshots, mock-ups, recordings)
export async function createSupportRequest(userId: string, input: SupportRequestInput, files: UploadedMedia[]) {
  const user = await getUserInfo(userId);
  const ref = supportCollection.doc();
  const now = nowIso();

  const content: ReportContent = {
    subject: input.subject,
    description: input.description,
    severity: input.type === "bug" ? input.severity : null,
    reporter: { name: user?.name ?? "", email: user?.email ?? "" },
    attachments: await saveAttachments(`support/${ref.id}`, files),
  };
  const request: SupportRequestDoc = {
    type: input.type,
    status: "todo",
    assigneeId: null,
    reporterId: userId,
    data: encryptJson(content),
    updateId: null,
    ...(input.type === "feature" && { review: "under-review", voterIds: [], votes: 0 }),
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(request);
  return { id: ref.id, type: request.type, subject: content.subject, createdAt: now };
}

// Newest first by an ISO date. Sorted here (not in Firestore) so the queries
// filter on one field only and need no composite index.
const newestFirst =
  <T,>(dateOf: (item: T) => string) =>
  (a: T, b: T) =>
    dateOf(b).localeCompare(dateOf(a));

// Every report of one type, newest first, for the developers' Kanban board.
// Not paged: a board needs all its cards (like the To Do board).
export async function listBoard({ type }: BoardQuery) {
  const [snapshot, team] = await Promise.all([
    supportCollection.where("type", "==", type).get(),
    teamService.listDevelopers(),
  ]);
  return snapshot.docs.map((doc) => toReport(doc, team)).sort(newestFirst((report) => report.createdAt));
}

// Move a card to another column, assign it, and/or review a feature request.
// Only team developers can be assigned.
export async function updateReport(id: string, input: UpdateReportInput) {
  const ref = supportCollection.doc(id);
  const report = dataOrNotFound<SupportRequestDoc | LegacySupportRequestDoc>(await ref.get(), "Report");
  if (input.review && report.type !== "feature") throw new ApiError(400, "Only feature requests can be approved or rejected");
  const team = await teamService.listDevelopers();

  if (input.assigneeId && !team.some((member) => member.id === input.assigneeId)) {
    throw new ApiError(400, "Only developers on the team can be assigned");
  }
  const now = nowIso();
  // doneAt orders the Updates page: the task finished last is listed first
  await ref.update({ ...input, updatedAt: now, ...(input.status === "done" && { doneAt: now }) });
  return toReport(await ref.get(), team);
}

// One report with everything developers see on the board (e.g. a feature request opened from Feature Review)
export async function getReport(id: string) {
  const [doc, team] = await Promise.all([supportCollection.doc(id).get(), teamService.listDevelopers()]);
  dataOrNotFound(doc, "Report");
  return toReport(doc, team);
}

export async function getAttachment(id: string, index: number) {
  const report = readReport(dataOrNotFound(await supportCollection.doc(id).get(), "Report"));
  return readAttachment(report.attachments, index);
}

// Done reports (both types) for the Updates page, with whether an update was published.
// The task moved to Done last is first (older reports without doneAt use their last change).
export async function listDoneReports() {
  const [snapshot, team] = await Promise.all([
    supportCollection.where("status", "==", "done").get(),
    teamService.listDevelopers(),
  ]);
  return snapshot.docs.map((doc) => toReport(doc, team)).sort(newestFirst((report) => report.doneAt ?? report.updatedAt));
}

// Used when an update is published for a done report
export async function getDoneReport(id: string) {
  const report = readReport(dataOrNotFound(await supportCollection.doc(id).get(), "Report"));
  if (report.status !== "done") throw new ApiError(400, "Only done tasks can be marked as implemented");
  if (report.updateId) throw new ApiError(409, "An update was already published for this task");
  return report;
}

export const markImplemented = (id: string, updateId: string) =>
  supportCollection.doc(id).update({ updateId, updatedAt: nowIso() });

export const reportTypeLabel = (type: ReportType) => (type === "bug" ? "Bug fix" : "New feature");
