import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import type { DocumentSnapshot } from "firebase-admin/firestore";
import crypto from "node:crypto";
import path from "node:path";
import { R2_BUCKET, r2 } from "../../config/r2";
import { ApiError } from "../../utils/apiError";
import { recordAudit } from "../../utils/audit";
import { nowIso } from "../../utils/date";
import { decryptBuffer, encryptBuffer } from "../../utils/encryption";
import { dataOrNotFound, includesText, paginate, userCollection } from "../../utils/firestore";
import type { FileDoc, FileQuery, UploadedFile } from "./file.types";
import { ALLOWED_TYPES, getExtension } from "./file.upload";

const files = (userId: string) => userCollection(userId, "files");

// Same shape as the frontend's file list. Download with GET /files/:id/download.
function toFile(doc: DocumentSnapshot) {
  const { name, size, mimeType, createdAt } = doc.data() as FileDoc;
  return { id: doc.id, name, size, mimeType, uploadedAt: createdAt.slice(0, 10) };
}

// Newest first. Name search runs after the query (see paginate).
export async function listFiles(userId: string, { page, limit, search }: FileQuery) {
  const nameMatches = search ? (item: { name: string }) => includesText(item.name, search) : undefined;
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
  await r2.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: storageKey, Body: encryptBuffer(upload.buffer) }));

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
  const object = await r2.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: file.storageKey }));
  if (!object.Body) throw new ApiError(404, "File not found");

  const content = decryptBuffer(Buffer.from(await object.Body.transformToByteArray()));
  await recordAudit(userId, "download", "file", id);
  return { name: file.name, mimeType: file.mimeType, content };
}

export async function deleteFile(userId: string, id: string) {
  const { ref, file } = await getFileDoc(userId, id);
  await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: file.storageKey }));
  await ref.delete();
  await recordAudit(userId, "delete", "file", id);
}
