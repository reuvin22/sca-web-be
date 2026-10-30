import type { ErrorRequestHandler, RequestHandler } from "express";
import { ApiError } from "../utils/apiError";

// Firestore error codes (gRPC) we turn into friendly client errors.
const FIRESTORE_ERRORS: Record<number, { statusCode: number; message: string }> = {
  5: { statusCode: 404, message: "Record not found" }, // NOT_FOUND
  6: { statusCode: 409, message: "A record with this value already exists" }, // ALREADY_EXISTS
};

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

// Central error handler. Express 5 sends errors from async controllers here automatically.
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({ success: false, message: error.message, details: error.details });
    return;
  }

  const firestoreError = typeof error?.code === "number" ? FIRESTORE_ERRORS[error.code] : undefined;
  if (firestoreError) {
    res.status(firestoreError.statusCode).json({ success: false, message: firestoreError.message });
    return;
  }

  // Errors from express.json() (invalid JSON, body too large) have a safe status and message.
  if (typeof error?.status === "number" && error.expose) {
    res.status(error.status).json({ success: false, message: error.message });
    return;
  }

  // Unknown error: log it, but never send internal details to the client.
  // A missing Firestore index also lands here; its log message has a link to create the index.
  console.error(error);
  res.status(500).json({ success: false, message: "Internal server error" });
};
