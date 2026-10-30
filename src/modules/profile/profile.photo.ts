import { uploadSingle } from "../../middlewares/upload.middleware";

export const PHOTO_MAX_SIZE_MB = 2; // same as the frontend

// Allowed profile photo types (extension -> content type sent back when viewing)
export const PHOTO_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

// multipart/form-data with one field named "photo"
export const uploadProfilePhoto = uploadSingle({ field: "photo", allowedTypes: PHOTO_TYPES, maxSizeMb: PHOTO_MAX_SIZE_MB });
