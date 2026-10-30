import type { z } from "zod";
import type { fileQuerySchema } from "./file.validator";

export type FileQuery = z.infer<typeof fileQuerySchema>;

// The parts of an uploaded multer file we use
export interface UploadedFile {
  originalname: string;
  size: number;
  buffer: Buffer;
}

// Firestore: users/{userId}/files/{id}. The content is in R2 under `storageKey`.
export interface FileDoc {
  name: string;
  storageKey: string;
  mimeType: string;
  size: number;
  createdAt: string;
}
