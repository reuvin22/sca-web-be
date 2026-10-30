import type { Request, Response } from "express";
import { getUserId } from "../../middlewares/auth.middleware";
import { ApiError } from "../../utils/apiError";
import { sendSuccess } from "../../utils/apiResponse";
import type { IdParams } from "../../utils/schema";
import * as fileService from "./file.service";
import type { FileQuery } from "./file.types";

export async function listFiles(req: Request, res: Response) {
  // validate() already parsed the query
  const query = req.query as unknown as FileQuery;
  const { files, pagination } = await fileService.listFiles(getUserId(req), query);
  sendSuccess(res, files, 200, pagination);
}

export async function uploadFile(req: Request, res: Response) {
  // uploadSingleFile already checked that a file was sent
  if (!req.file) throw new ApiError(400, "Please choose a file to upload");
  sendSuccess(res, await fileService.uploadFile(getUserId(req), req.file), 201);
}

export async function downloadFile(req: Request<IdParams>, res: Response) {
  const { name, mimeType, content } = await fileService.downloadFile(getUserId(req), req.params.id);
  res.attachment(name).type(mimeType).send(content);
}

export async function deleteFile(req: Request<IdParams>, res: Response) {
  await fileService.deleteFile(getUserId(req), req.params.id);
  res.status(204).send();
}
