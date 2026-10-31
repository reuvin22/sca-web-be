import type { Request, Response } from "express";
import { getUserId } from "../../middlewares/auth.middleware";
import { sendSuccess } from "../../utils/apiResponse";
import type { IdParams } from "../../utils/schema";
import * as documentService from "./document.service";
import type { DocumentQuery } from "./document.types";
import type { DocumentUploads } from "./document.upload";
import { documentFieldsSchema } from "./document.validator";

// Name, draft flag and the uploaded files (uploadDocument already checked them)
function readUpload(req: Request) {
  const fields = documentFieldsSchema.parse(req.body ?? {});
  const files = req.files as DocumentUploads;
  return {
    name: fields.name,
    draft: fields.draft === "true",
    project: files.project![0].buffer,
    source: files.source?.[0]?.buffer,
  };
}

export async function listDocuments(req: Request, res: Response) {
  // validate() already parsed the query
  const query = req.query as unknown as DocumentQuery;
  const { documents, pagination } = await documentService.listDocuments(getUserId(req), query);
  sendSuccess(res, documents, 200, pagination);
}

export async function getDocument(req: Request<IdParams>, res: Response) {
  sendSuccess(res, await documentService.getDocument(getUserId(req), req.params.id));
}

export async function getSource(req: Request<IdParams>, res: Response) {
  res.type("application/pdf").send(await documentService.getSource(getUserId(req), req.params.id));
}

export async function createDocument(req: Request, res: Response) {
  sendSuccess(res, await documentService.createDocument(getUserId(req), readUpload(req)), 201);
}

export async function updateDocument(req: Request<IdParams>, res: Response) {
  sendSuccess(res, await documentService.updateDocument(getUserId(req), req.params.id, readUpload(req)));
}

export async function deleteDocument(req: Request<IdParams>, res: Response) {
  await documentService.deleteDocument(getUserId(req), req.params.id);
  res.status(204).send();
}
