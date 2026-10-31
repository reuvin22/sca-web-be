import type { DocumentSnapshot } from "firebase-admin/firestore";
import crypto from "node:crypto";
import { recordAudit } from "../audit/audit.service";
import { ApiError } from "../../utils/apiError";
import { nowIso } from "../../utils/date";
import { decryptJson, encryptJson } from "../../utils/encryption";
import { dataOrNotFound, includesText, paginate, userCollection } from "../../utils/firestore";
import { deleteObject, readEncryptedObject, saveEncryptedObject } from "../../utils/storage";
import type { DocumentDoc, DocumentInfo, DocumentProject, DocumentQuery } from "./document.types";
import { projectSchema } from "./document.validator";

// Document Storage: PDFs made in the PDF editor (separate from Files, which holds the user's own uploads).
// The editable project and the original PDF are stored encrypted in R2; Firestore keeps the encrypted details.

const documents = (userId: string) => userCollection(userId, "documents");
const UNTITLED = "Untitled document";

function toDocument(doc: DocumentSnapshot) {
  const raw = doc.data() as DocumentDoc;
  const { name, draft, pageCount, sourceKey } = decryptJson<DocumentInfo>(raw.data);
  return {
    id: doc.id,
    name,
    draft,
    pageCount,
    hasSource: Boolean(sourceKey),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

// Checks the uploaded project file (JSON) and returns it
function readProject(buffer: Buffer): DocumentProject {
  let json: unknown;
  try {
    json = JSON.parse(buffer.toString("utf8"));
  } catch {
    throw new ApiError(400, "The document content is not valid");
  }
  const result = projectSchema.safeParse(json);
  if (!result.success || result.data.objects.length !== result.data.pages.length) {
    throw new ApiError(400, "The document content is not valid");
  }
  return result.data;
}

// Most recently changed first. Names are encrypted, so search runs after decrypting (see paginate).
export async function listDocuments(userId: string, { page, limit, search }: DocumentQuery) {
  const matches = search ? (item: ReturnType<typeof toDocument>) => includesText(item.name, search) : undefined;
  const { items, pagination } = await paginate(
    documents(userId).orderBy("updatedAt", "desc"),
    { page, limit },
    toDocument,
    matches,
  );
  return { documents: items, pagination };
}

async function getInfo(userId: string, id: string) {
  const ref = documents(userId).doc(id);
  const raw = dataOrNotFound<DocumentDoc>(await ref.get(), "Document");
  return { ref, info: decryptJson<DocumentInfo>(raw.data) };
}

// The details plus the editable project, to open it in the editor
export async function getDocument(userId: string, id: string) {
  const { ref, info } = await getInfo(userId, id);
  const project = JSON.parse((await readEncryptedObject(info.projectKey)).toString("utf8")) as DocumentProject;
  return { ...toDocument(await ref.get()), project };
}

// The original PDF the document was made from
export async function getSource(userId: string, id: string) {
  const { info } = await getInfo(userId, id);
  if (!info.sourceKey) throw new ApiError(404, "This document has no original PDF");
  return readEncryptedObject(info.sourceKey);
}

interface SaveInput {
  name: string;
  draft: boolean;
  project: Buffer;
  source?: Buffer;
}

export async function createDocument(userId: string, { name, draft, project, source }: SaveInput) {
  const checked = readProject(project);
  // Random keys, so the document's name never becomes part of the storage path
  const projectKey = `${userId}/documents/${crypto.randomUUID()}`;
  const sourceKey = source ? `${userId}/documents/${crypto.randomUUID()}` : null;
  await saveEncryptedObject(projectKey, project);
  if (source && sourceKey) await saveEncryptedObject(sourceKey, source);

  const info: DocumentInfo = { name: name || UNTITLED, draft, pageCount: checked.pages.length, projectKey, sourceKey };
  const now = nowIso();
  const doc: DocumentDoc = { data: encryptJson(info), createdAt: now, updatedAt: now };
  const ref = await documents(userId).add(doc);
  await recordAudit(userId, "create", "document", ref.id);
  return toDocument(await ref.get());
}

// Replaces the project (the original PDF never changes)
export async function updateDocument(userId: string, id: string, { name, draft, project }: SaveInput) {
  const checked = readProject(project);
  const { ref, info } = await getInfo(userId, id);
  await saveEncryptedObject(info.projectKey, project);
  const next: DocumentInfo = { ...info, name: name || info.name, draft, pageCount: checked.pages.length };
  await ref.update({ data: encryptJson(next), updatedAt: nowIso() });
  await recordAudit(userId, "update", "document", id);
  return toDocument(await ref.get());
}

export async function deleteDocument(userId: string, id: string) {
  const { ref, info } = await getInfo(userId, id);
  await deleteObject(info.projectKey);
  if (info.sourceKey) await deleteObject(info.sourceKey);
  await ref.delete();
  await recordAudit(userId, "delete", "document", id);
}
