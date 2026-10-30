import type { Request, Response } from "express";
import { getUserId } from "../../middlewares/auth.middleware";
import { openStream } from "../../utils/realtime";

// Keeps the connection open and pushes notifications as they happen (Server-Sent Events)
export function stream(req: Request, res: Response) {
  openStream(getUserId(req), res);
}
