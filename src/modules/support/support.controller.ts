import type { Request, Response } from "express";
import { getUserId } from "../../middlewares/auth.middleware";
import { sendSuccess } from "../../utils/apiResponse";
import type { IdParams } from "../../utils/schema";
import * as supportService from "./support.service";
import type { AttachmentParams, BoardQuery, SupportRequestInput, UpdateReportInput } from "./support.types";

export async function createSupportRequest(req: Request<object, unknown, SupportRequestInput>, res: Response) {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  sendSuccess(res, await supportService.createSupportRequest(getUserId(req), req.body, files), 201);
}

export async function listBoard(req: Request, res: Response) {
  // validate() already parsed the query
  sendSuccess(res, await supportService.listBoard(req.query as unknown as BoardQuery));
}

export async function updateReport(req: Request<IdParams, unknown, UpdateReportInput>, res: Response) {
  sendSuccess(res, await supportService.updateReport(req.params.id, req.body));
}

export async function getReport(req: Request<IdParams>, res: Response) {
  sendSuccess(res, await supportService.getReport(req.params.id));
}

export async function getAttachment(req: Request, res: Response) {
  const { id, index } = req.params as unknown as AttachmentParams;
  const { mimeType, content } = await supportService.getAttachment(id, index);
  res.type(mimeType).set("Cache-Control", "private, no-store").send(content);
}
