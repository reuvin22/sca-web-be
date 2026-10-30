import crypto from "node:crypto";
import path from "node:path";
import { getExtension, uploadMultiple } from "../middlewares/upload.middleware";
import { ApiError } from "./apiError";
import { readEncryptedObject, saveEncryptedObject } from "./storage";

// Image and video attachments (bug reports, system updates). Stored encrypted in R2.

export const MEDIA_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
};

// Up to 6 files: videos 50 MB each, images 10 MB each, 100 MB per request
export const uploadMedia = uploadMultiple({
  field: "media",
  allowedTypes: MEDIA_TYPES,
  maxSizeMb: 50,
  maxCount: 6,
  maxTotalMb: 100,
});

export interface Attachment {
  storageKey: string; // never sent to the browser
  name: string;
  mimeType: string;
  size: number;
  kind: "image" | "video";
}

interface UploadedMedia {
  originalname: string;
  size: number;
  buffer: Buffer;
}

// Saves uploaded files under `folder` and returns what to keep in Firestore
export async function saveAttachments(folder: string, files: UploadedMedia[]): Promise<Attachment[]> {
  return Promise.all(
    files.map(async (file) => {
      const mimeType = MEDIA_TYPES[getExtension(file.originalname)];
      const storageKey = `${folder}/${crypto.randomUUID()}`;
      await saveEncryptedObject(storageKey, file.buffer);
      return {
        storageKey,
        name: path.basename(file.originalname).slice(0, 255),
        mimeType,
        size: file.size,
        kind: mimeType.startsWith("video/") ? "video" : "image",
      } satisfies Attachment;
    }),
  );
}

// Safe to send to the browser: no storage keys. Each item is downloaded by its index.
export const toPublicAttachments = (attachments: Attachment[] = []) =>
  attachments.map(({ name, mimeType, size, kind }, index) => ({ index, name, mimeType, size, kind }));

export async function readAttachment(attachments: Attachment[] = [], index: number) {
  const attachment = attachments[index];
  if (!attachment) throw new ApiError(404, "Attachment not found");
  return { mimeType: attachment.mimeType, content: await readEncryptedObject(attachment.storageKey) };
}
