import type { DocumentSnapshot } from "firebase-admin/firestore";
import crypto from "node:crypto";
import path from "node:path";
import { getExtension } from "../../middlewares/upload.middleware";
import { recordAudit } from "../../utils/audit";
import { nowIso } from "../../utils/date";
import { dataOrNotFound, includesText, paginate, userCollection } from "../../utils/firestore";
import { deleteObject, readEncryptedObject, saveEncryptedObject } from "../../utils/storage";
import type { FileDoc, FileQuery, UploadedFile } from "./file.types";
import { ALLOWED_TYPES, isFileKind } from "./file.upload";

const files = (userId: string) => userCollection(userId, "files");

// Same shape as the frontend's file list. Download with GET /files/:id/download.
function toFile(doc: DocumentSnapshot) {
  const { name, size, mimeType, createdAt } = doc.data() as FileDoc;
  return { id: doc.id, name, size, mimeType, uploadedAt: createdAt.slice(0, 10) };
}

// Newest first. Name search and type filter run after the query (see paginate).
export async function listFiles(userId: string, { page, limit, search, kind }: FileQuery) {
  const nameMatches =
    search || kind
      ? (item: { name: string }) => includesText(item.name, search) && (!kind || isFileKind(item.name, kind))
      : undefined;
  const { items, pagination } = await paginate(
    files(userId).orderBy("createdAt", "desc"),
    { page, limit },
    toFile,
    nameMatches,
  );
  return { files: items, pagination };
}

export async function uploadFile(userId: string, upload: UploadedFile) {
  // A random key, so a user's file name never becomes part of the storage path
  const storageKey = `${userId}/${crypto.randomUUID()}`;
  await saveEncryptedObject(storageKey, upload.buffer);

  const file: FileDoc = {
    name: path.basename(upload.originalname).slice(0, 255),
    storageKey,
    mimeType: ALLOWED_TYPES[getExtension(upload.originalname)],
    size: upload.size,
    createdAt: nowIso(),
  };
  const ref = await files(userId).add(file);
  await recordAudit(userId, "create", "file", ref.id);
  return toFile(await ref.get());
}

async function getFileDoc(userId: string, id: string) {
  const ref = files(userId).doc(id);
  return { ref, file: dataOrNotFound<FileDoc>(await ref.get(), "File") };
}

export async function downloadFile(userId: string, id: string) {
  const { file } = await getFileDoc(userId, id);
  const content = await readEncryptedObject(file.storageKey);
  await recordAudit(userId, "download", "file", id);
  return { name: file.name, mimeType: file.mimeType, content };
}

export async function deleteFile(userId: string, id: string) {
  const { ref, file } = await getFileDoc(userId, id);
  await deleteObject(file.storageKey);
  await ref.delete();
  await recordAudit(userId, "delete", "file", id);
}
