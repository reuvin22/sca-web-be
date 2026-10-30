import type { Request } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { ApiError } from "../utils/apiError";

// Rate limits so nobody can spam requests. Counts are kept in memory, which is fine for one server
// (Render / one DigitalOcean instance); with several instances, move them to a shared store (e.g. Redis).
// Over the limit: 429 with the usual { success: false, message } body and a Retry-After header.

const MINUTE = 60 * 1000;

// By signed-in user when known (a whole school can share one IP address), otherwise by IP.
// ipKeyGenerator groups IPv6 addresses by network so one device can't rotate addresses.
const userOrIp = (req: Request) => (req.user ? `user:${req.user.id}` : `ip:${ipKeyGenerator(req.ip ?? "")}`);

interface LimitOptions {
  minutes: number;
  max: number;
  message: string;
  skipSuccessful?: boolean; // count only failed requests (e.g. wrong passwords)
  byUser?: boolean; // count per signed-in user instead of per IP
  skip?: (req: Request) => boolean; // requests that don't count
}

function limiter(options: LimitOptions) {
  return rateLimit({
    windowMs: options.minutes * MINUTE,
    limit: options.max,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessful ?? false,
    ...(options.byUser && { keyGenerator: userOrIp }),
    ...(options.skip && { skip: options.skip }),
    handler: (_req, _res, next) => next(new ApiError(429, options.message)),
  });
}

// Every API request, per IP. High enough for normal use (a page loads several lists at once).
export const apiLimiter = limiter({
  minutes: 1,
  max: 300,
  message: "Too many requests. Please wait a minute and try again.",
});

// General API use after sign-in (create, read, update, delete), per user
export const userLimiter = limiter({
  minutes: 10,
  max: 400,
  byUser: true,
  message: "Too many requests. Please wait 10 minutes and try again.",
});

// Password guessing: only failed sign-ins count
export const loginLimiter = limiter({
  minutes: 10,
  max: 3,
  skipSuccessful: true,
  message: "Too many failed sign-in attempts. Please wait 10 minutes and try again.",
});

// Forgot password: the first request and one resend, per IP
export const forgotPasswordLimiter = limiter({
  minutes: 3,
  max: 2,
  message: "A reset link was already sent. Please wait 3 minutes before asking for another.",
});

// Other requests that send an email (register, resend confirmation), per IP
export const emailLimiter = limiter({
  minutes: 60,
  max: 5,
  message: "Too many emails requested. Please wait an hour and try again.",
});

// One-time links and tokens (verify email, reset password, developer registration), per IP
export const tokenLimiter = limiter({
  minutes: 15,
  max: 20,
  message: "Too many attempts. Please wait 15 minutes and try again.",
});

// File uploads (Files page and profile photo), per user
export const uploadLimiter = limiter({
  minutes: 10,
  max: 6,
  byUser: true,
  message: "You've uploaded 6 files already. Please wait 10 minutes before uploading more.",
});

// Contact Support / feature requests, per user
export const supportLimiter = limiter({
  minutes: 10,
  max: 5,
  byUser: true,
  message: "You've sent several requests already. Please wait 10 minutes before sending another.",
});

// Developer invitations (each one sends an email), per user
export const inviteLimiter = limiter({
  minutes: 60,
  max: 20,
  byUser: true,
  message: "Too many invitations sent. Please wait an hour and try again.",
});
