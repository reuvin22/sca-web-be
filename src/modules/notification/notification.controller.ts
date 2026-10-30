import type { Request, Response } from "express";
import { getUserId } from "../../middlewares/auth.middleware";
import { sendSuccess } from "../../utils/apiResponse";
import { openStream } from "../../utils/realtime";
import * as notificationService from "./notification.service";
import type { MarkReadInput } from "./notification.types";

// Keeps the connection open and pushes notifications as they happen (Server-Sent Events)
export function stream(req: Request, res: Response) {
  openStream(getUserId(req), res);
}

// Saves which bell notifications this user has read
export async function markRead(req: Request<object, unknown, MarkReadInput>, res: Response) {
  sendSuccess(res, await notificationService.markRead(getUserId(req), req.body.ids));
}
