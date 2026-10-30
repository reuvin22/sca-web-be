import type { RequestHandler } from "express";
import multer from "multer";
import path from "node:path";
import { ApiError } from "../utils/apiError";

export const getExtension = (fileName: string) => path.extname(fileName).toLowerCase();

interface UploadOptions {
  field: string; // multipart field name, e.g. "file"
  allowedTypes: Record<string, string>; // extension -> content type
  maxSizeMb: number;
}

// Accepts one uploaded file, kept in memory so it can be encrypted before it is stored.
// Rejects other types, files that are too big, and requests without a file (400).
export function uploadSingle({ field, allowedTypes, maxSizeMb }: UploadOptions): RequestHandler {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxSizeMb * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, callback) => {
      if (allowedTypes[getExtension(file.originalname)]) return callback(null, true);
      callback(new ApiError(400, "This file type is not allowed"));
    },
  }).single(field);

  return (req, res, next) => {
    upload(req, res, (error: unknown) => {
      if (error instanceof multer.MulterError) {
        const message = error.code === "LIMIT_FILE_SIZE" ? `File must be ${maxSizeMb} MB or smaller` : error.message;
        return next(new ApiError(400, message));
      }
      if (error) return next(error);
      if (!req.file) return next(new ApiError(400, "Please choose a file to upload"));
      next();
    });
  };
}
