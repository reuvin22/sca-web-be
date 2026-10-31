import type { RequestHandler } from "express";
import multer from "multer";
import { ApiError } from "../../utils/apiError";

const MB = 1024 * 1024;
export const MAX_DOCUMENT_MB = 50; // the original PDF (same limit as Files)
export const MAX_PROJECT_MB = 30; // edits, including pictures added to the pages

// multipart/form-data: "project" (JSON file, required) and "source" (the original PDF, only when creating)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_DOCUMENT_MB * MB, files: 2 },
}).fields([
  { name: "project", maxCount: 1 },
  { name: "source", maxCount: 1 },
]);

export type DocumentUploads = { project?: Express.Multer.File[]; source?: Express.Multer.File[] };

// Reads the upload and checks the files are what they say: the project is JSON (checked in the service),
// the source is a PDF
export const uploadDocument: RequestHandler = (req, res, next) => {
  if (Number(req.headers["content-length"] ?? 0) > (MAX_DOCUMENT_MB + MAX_PROJECT_MB) * MB) {
    return next(new ApiError(400, `Documents must be ${MAX_DOCUMENT_MB} MB or smaller`));
  }
  upload(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      const tooBig = error.code === "LIMIT_FILE_SIZE";
      return next(new ApiError(400, tooBig ? `Documents must be ${MAX_DOCUMENT_MB} MB or smaller` : "Invalid upload"));
    }
    if (error) return next(error);
    const files = (req.files ?? {}) as DocumentUploads;
    const project = files.project?.[0];
    if (!project) return next(new ApiError(400, "The document content is missing"));
    if (project.size > MAX_PROJECT_MB * MB) {
      return next(new ApiError(400, `The edits must be ${MAX_PROJECT_MB} MB or smaller`));
    }
    const source = files.source?.[0];
    if (source && source.buffer.subarray(0, 5).toString("latin1") !== "%PDF-") {
      return next(new ApiError(400, "The original file is not a PDF"));
    }
    next();
  });
};
