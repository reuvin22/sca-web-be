import type { z } from "zod";
import type { fileQuerySchema } from "./file.validator";

export type FileQuery = z.infer<typeof fileQuerySchema>;

// The parts of an uploaded multer file we use
export interface UploadedFile {
  originalname: string;
  size: number;
  buffer: Buffer;
}

// File details. The content is in R2 under `storageKey`.
export interface FileInfo {
  name: string;
  storageKey: string;
  mimeType: string;
  size: number;
}

// Firestore: users/{userId}/files/{id}
export interface FileDoc {
  data: string; // AES-256-GCM encrypted JSON: FileInfo
  createdAt: string;
}

// Saved before full encryption (plain fields)
export type LegacyFileDoc = FileInfo & { createdAt: string };
