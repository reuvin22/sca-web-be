import type { RequestHandler } from "express";
import multer from "multer";
import path from "node:path";
import { ApiError } from "../utils/apiError";

export const getExtension = (fileName: string) => path.extname(fileName).toLowerCase();

// Every upload route: images can be at most 10 MB (other files use the route's maxSizeMb)
export const IMAGE_MAX_SIZE_MB = 10;
const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];
const isImage = (fileName: string) => IMAGE_EXTENSIONS.includes(getExtension(fileName));
const MB = 1024 * 1024;

interface UploadOptions {
  field: string; // multipart field name, e.g. "file"
  allowedTypes: Record<string, string>; // extension -> content type
  maxSizeMb: number; // per file
}

interface MultipleUploadOptions extends UploadOptions {
  maxCount: number;
  maxTotalMb: number; // whole request, checked before reading it (files are kept in memory)
}

function createMulter({ allowedTypes, maxSizeMb }: UploadOptions, maxCount: number) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxSizeMb * MB, files: maxCount },
    fileFilter: (_req, file, callback) => {
      if (allowedTypes[getExtension(file.originalname)]) return callback(null, true);
      callback(new ApiError(400, `${file.originalname}: this file type is not allowed`));
    },
  });
}

// Turns multer errors into 400s and checks the 10 MB image rule
function checkUpload(error: unknown, files: Express.Multer.File[], maxSizeMb: number): ApiError | Error | null {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") return new ApiError(400, `Files must be ${maxSizeMb} MB or smaller`);
    if (error.code === "LIMIT_FILE_COUNT" || error.code === "LIMIT_UNEXPECTED_FILE") {
      return new ApiError(400, "Too many files");
    }
    return new ApiError(400, error.message);
  }
  if (error) return error as Error;
  const bigImage = files.find((file) => isImage(file.originalname) && file.size > IMAGE_MAX_SIZE_MB * MB);
  if (bigImage) return new ApiError(400, `${bigImage.originalname}: images must be ${IMAGE_MAX_SIZE_MB} MB or smaller`);
  return null;
}

// Accepts one uploaded file, kept in memory so it can be encrypted before it is stored.
// Rejects other types, files that are too big (images: 10 MB), and requests without a file (400).
export function uploadSingle(options: UploadOptions): RequestHandler {
  const upload = createMulter(options, 1).single(options.field);

  return (req, res, next) => {
    upload(req, res, (error: unknown) => {
      if (!error && !req.file) return next(new ApiError(400, "Please choose a file to upload"));
      next(checkUpload(error, req.file ? [req.file] : [], options.maxSizeMb) ?? undefined);
    });
  };
}

// Accepts 0 to `maxCount` files in one field (e.g. images and videos). Text fields end up in req.body.
export function uploadMultiple(options: MultipleUploadOptions): RequestHandler {
  const upload = createMulter(options, options.maxCount).array(options.field, options.maxCount);

  return (req, res, next) => {
    // Stop very large requests before they are read into memory
    if (Number(req.headers["content-length"] ?? 0) > options.maxTotalMb * MB) {
      return next(new ApiError(400, `Attachments must be ${options.maxTotalMb} MB or smaller in total`));
    }
    upload(req, res, (error: unknown) => {
      const files = (req.files as Express.Multer.File[] | undefined) ?? [];
      next(checkUpload(error, files, options.maxSizeMb) ?? undefined);
    });
  };
}
