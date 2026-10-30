import type { DocumentSnapshot } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../../config/firebase";
import { broadcast } from "../../utils/realtime";
import { ApiError } from "../../utils/apiError";
import { readAttachment, saveAttachments, toPublicAttachments } from "../../utils/attachments";
import { nowIso } from "../../utils/date";
import { decryptJson, encryptJson, isSealed } from "../../utils/encryption";
import { dataOrNotFound, paginate, usersCollection } from "../../utils/firestore";
import { MAX_PAGE_SIZE, type PaginationQuery } from "../../utils/pagination";
import type { UserDoc } from "../profile/profile.types";
import { getUserInfo } from "../profile/profile.user";
import * as supportService from "../support/support.service";
import { isBlankHtml, sanitizeUpdateHtml } from "./update.sanitize";
import type { CreateUpdateInput, LegacyUpdateDoc, SystemUpdate, UpdateContent, UpdateDoc } from "./update.types";

// System updates: published by a developer when a done report is implemented.
// Every other user sees them in their notifications.
const updatesCollection = db.collection("updates");

interface UploadedMedia {
  originalname: string;
  size: number;
  buffer: Buffer;
}

// The update with its encrypted content decrypted (older updates have plain fields)
function readUpdate(raw: UpdateDoc | LegacyUpdateDoc): SystemUpdate {
  if (!isSealed(raw)) return raw;
  const { data, ...fields } = raw;
  return { ...fields, ...decryptJson<UpdateContent>(data) };
}

const loadUpdate = (doc: DocumentSnapshot) => readUpdate(doc.data() as UpdateDoc | LegacyUpdateDoc);

function toUpdate(doc: DocumentSnapshot) {
  const { media, ...update } = loadUpdate(doc);
  return { id: doc.id, ...update, media: toPublicAttachments(media) };
}

// "This task is implemented": publishes the update and marks the report as implemented
export async function publishUpdate(authorId: string, input: CreateUpdateInput, files: UploadedMedia[]) {
  const report = await supportService.getDoneReport(input.reportId);
  const contentHtml = sanitizeUpdateHtml(input.content);
  if (isBlankHtml(contentHtml) && files.length === 0) throw new ApiError(400, "Write what changed or add images/videos");

  const author = await getUserInfo(authorId);
  const ref = updatesCollection.doc();
  const content: UpdateContent = {
    title: report.subject,
    contentHtml,
    media: await saveAttachments(`updates/${ref.id}`, files),
    authorName: author?.name ?? "",
  };
  const update: UpdateDoc = {
    reportId: input.reportId,
    reportType: report.type,
    authorId,
    publishedAt: nowIso(),
    data: encryptJson(content),
  };
  await ref.set(update);
  await supportService.markImplemented(input.reportId, ref.id);

  // Real time: every other signed-in user gets the notification right away
  const notification = { id: ref.id, title: content.title, reportType: update.reportType, publishedAt: update.publishedAt, read: false };
  broadcast("system-update", notification, { exceptUserId: authorId });

  return toUpdate(await ref.get());
}

// Done tasks for the developers' Updates page
export const listDoneTasks = () => supportService.listDoneReports();

export async function listUpdates(pagination: PaginationQuery) {
  const { items, pagination: meta } = await paginate(updatesCollection.orderBy("publishedAt", "desc"), pagination, toUpdate);
  return { updates: items, pagination: meta };
}

export async function getUpdate(id: string) {
  const doc = await updatesCollection.doc(id).get();
  dataOrNotFound(doc, "Update");
  return toUpdate(doc);
}

export async function getMedia(id: string, index: number) {
  const update = readUpdate(dataOrNotFound<UpdateDoc | LegacyUpdateDoc>(await updatesCollection.doc(id).get(), "Update"));
  return readAttachment(update.media, index);
}

// Remembers that this user opened the update (it stops being "unread" in notifications)
export async function markRead(userId: string, id: string) {
  dataOrNotFound(await updatesCollection.doc(id).get(), "Update");
  await usersCollection.doc(userId).update({ readUpdateIds: FieldValue.arrayUnion(id) });
}

// Latest updates by other users, for the notification bell: [{ id, title, reportType, publishedAt, read }]
export async function getUpdateNotifications(userId: string) {
  const [snapshot, userDoc] = await Promise.all([
    updatesCollection.orderBy("publishedAt", "desc").limit(MAX_PAGE_SIZE + 5).get(),
    usersCollection.doc(userId).get(),
  ]);
  // Read by opening the update page, or by clicking it / "Mark all as read" in the bell
  const user = userDoc.data() as UserDoc | undefined;
  const readIds = [...(user?.readUpdateIds ?? []), ...(user?.readNotificationIds ?? []).map((id) => id.replace(/^update-/, ""))];

  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...loadUpdate(doc) }))
    .filter((update) => update.authorId !== userId) // the author isn't notified about their own update
    .slice(0, MAX_PAGE_SIZE)
    .map(({ id, title, reportType, publishedAt }) => ({ id, title, reportType, publishedAt, read: readIds.includes(id) }));
}
