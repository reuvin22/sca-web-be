import type { Request, Response } from "express";
import { getUserId } from "../../middlewares/auth.middleware";
import { sendSuccess } from "../../utils/apiResponse";
import type { PaginationQuery } from "../../utils/pagination";
import type { IdParams } from "../../utils/schema";
import * as updateService from "./update.service";
import type { CreateUpdateInput, MediaParams } from "./update.types";

export async function listDoneTasks(_req: Request, res: Response) {
  sendSuccess(res, await updateService.listDoneTasks());
}

export async function publishUpdate(req: Request<object, unknown, CreateUpdateInput>, res: Response) {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  sendSuccess(res, await updateService.publishUpdate(getUserId(req), req.body, files), 201);
}

export async function listUpdates(req: Request, res: Response) {
  // validate() already converted the query to numbers
  const { updates, pagination } = await updateService.listUpdates(req.query as unknown as PaginationQuery);
  sendSuccess(res, updates, 200, pagination);
}

export async function getUpdate(req: Request<IdParams>, res: Response) {
  sendSuccess(res, await updateService.getUpdate(req.params.id));
}

export async function getMedia(req: Request, res: Response) {
  const { id, index } = req.params as unknown as MediaParams;
  const { mimeType, content } = await updateService.getMedia(id, index);
  res.type(mimeType).set("Cache-Control", "private, no-store").send(content);
}

export async function markRead(req: Request<IdParams>, res: Response) {
  await updateService.markRead(getUserId(req), req.params.id);
  sendSuccess(res, { read: true });
}
