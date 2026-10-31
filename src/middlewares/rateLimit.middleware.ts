import type { Request } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { ApiError } from "../utils/apiError";
import { FirestoreRateLimitStore } from "../utils/firestoreRateLimitStore";

// Rate limits so nobody can spam requests. Over the limit: 429 with the usual
// { success: false, message } body and a Retry-After header.
// Sensitive limits (`shared: true`) are counted in Firestore so restarts don't reset them;
// the high-volume general limits are counted in memory.

const MINUTE = 60 * 1000;

// By signed-in user when known (a whole school can share one IP address), otherwise by IP.
// ipKeyGenerator groups IPv6 addresses by network so one device can't rotate addresses.
const userOrIp = (req: Request) => (req.user ? `user:${req.user.id}` : `ip:${ipKeyGenerator(req.ip ?? "")}`);

interface LimitOptions {
  name: string; // also the Firestore counter prefix
  minutes: number;
  max: number;
  message: string;
  skipSuccessful?: boolean; // count only failed requests (e.g. wrong passwords)
  byUser?: boolean; // count per signed-in user instead of per IP
  shared?: boolean; // keep the counter in Firestore
}

function limiter(options: LimitOptions) {
  return rateLimit({
    windowMs: options.minutes * MINUTE,
    limit: options.max,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessful ?? false,
    ...(options.byUser && { keyGenerator: userOrIp }),
    ...(options.shared && { store: new FirestoreRateLimitStore(options.name) }),
    handler: (_req, _res, next) => next(new ApiError(429, options.message)),
  });
}

// Every API request, per IP. High enough for normal use (a page loads several lists at once).
export const apiLimiter = limiter({
  name: "api",
  minutes: 1,
  max: 300,
  message: "Too many requests. Please wait a minute and try again.",
});

// General API use after sign-in (create, read, update, delete), per user
export const userLimiter = limiter({
  name: "user",
  minutes: 10,
  max: 400,
  byUser: true,
  message: "Too many requests. Please wait 10 minutes and try again.",
});

// Password guessing: only failed sign-ins count
export const loginLimiter = limiter({
  name: "login",
  minutes: 10,
  max: 3,
  skipSuccessful: true,
  shared: true,
  message: "Too many failed sign-in attempts. Please wait 10 minutes and try again.",
});

// Sign-in code guessing (each code also allows only 5 tries)
export const loginCodeLimiter = limiter({
  name: "code",
  minutes: 10,
  max: 10,
  skipSuccessful: true,
  shared: true,
  message: "Too many wrong codes. Please wait 10 minutes and sign in again.",
});

// Forgot password and new sign-in codes: the first request and one resend, per IP
export const forgotPasswordLimiter = limiter({
  name: "resend",
  minutes: 3,
  max: 2,
  shared: true,
  message: "An email was already sent. Please wait 3 minutes before asking for another.",
});

// Other requests that send an email (register, resend confirmation), per IP
export const emailLimiter = limiter({
  name: "email",
  minutes: 60,
  max: 5,
  shared: true,
  message: "Too many emails requested. Please wait an hour and try again.",
});

// One-time links and tokens (verify email, reset password, developer registration), per IP
export const tokenLimiter = limiter({
  name: "token",
  minutes: 15,
  max: 20,
  shared: true,
  message: "Too many attempts. Please wait 15 minutes and try again.",
});

// File uploads (Files page and profile photo), per user
export const uploadLimiter = limiter({
  name: "upload",
  minutes: 10,
  max: 6,
  byUser: true,
  shared: true,
  message: "You've uploaded 6 files already. Please wait 10 minutes before uploading more.",
});

// Contact Support / feature requests, per user
export const supportLimiter = limiter({
  name: "support",
  minutes: 10,
  max: 5,
  byUser: true,
  shared: true,
  message: "You've sent several requests already. Please wait 10 minutes before sending another.",
});

// Developer invitations (each one sends an email), per user
export const inviteLimiter = limiter({
  name: "invite",
  minutes: 60,
  max: 20,
  byUser: true,
  shared: true,
  message: "Too many invitations sent. Please wait an hour and try again.",
});

// Public form links (no sign-in): opening a form, per IP
export const publicFormLimiter = limiter({
  name: "public-form",
  minutes: 10,
  max: 60,
  message: "Too many requests. Please wait a few minutes and try again.",
});

// Public form links: sending answers, per IP (stops spam submissions)
export const formAnswerLimiter = limiter({
  name: "form-answer",
  minutes: 10,
  max: 10,
  shared: true,
  message: "You've sent several answers already. Please wait 10 minutes before sending another.",
});
