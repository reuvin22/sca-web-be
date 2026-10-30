import { getExtension, uploadSingle } from "../../middlewares/upload.middleware";

export const MAX_FILE_SIZE_MB = 25; // same as the frontend

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

// multipart/form-data with one field named "file"
export const uploadSingleFile = uploadSingle({ field: "file", allowedTypes: ALLOWED_TYPES, maxSizeMb: MAX_FILE_SIZE_MB });
