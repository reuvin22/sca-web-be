import type { RequestHandler } from "express";
import multer from "multer";
import path from "node:path";
import { ApiError } from "../../utils/apiError";

export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB, same as the frontend

// Allowed extensions and the content type we send back on download.
// We never trust the browser's content type.
export const ALLOWED_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".csv": "text/csv",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

export const getExtension = (fileName: string) => path.extname(fileName).toLowerCase();

// File type groups for the Files page filter (same labels as the frontend)
export const FILE_KINDS = {
  PDF: [".pdf"],
  Excel: [".xls", ".xlsx"],
  CSV: [".csv"],
  PowerPoint: [".ppt", ".pptx"],
  Image: [".png", ".jpg", ".jpeg"],
};

export const isFileKind = (fileName: string, kind: keyof typeof FILE_KINDS) =>
  FILE_KINDS[kind].includes(getExtension(fileName));

// Keeps the file in memory so it can be encrypted before it is written to disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (ALLOWED_TYPES[getExtension(file.originalname)]) return callback(null, true);
    callback(new ApiError(400, "This file type is not allowed"));
  },
}).single("file");

// Runs multer and turns its errors (e.g. file too large) into 400 responses.
export const uploadSingleFile: RequestHandler = (req, res, next) => {
  upload(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      const message = error.code === "LIMIT_FILE_SIZE" ? "File must be 25 MB or smaller" : error.message;
      return next(new ApiError(400, message));
    }
    if (error) return next(error);
    if (!req.file) return next(new ApiError(400, "Please choose a file to upload"));
    next();
  });
};
