import type { Request, Response } from "express";
import { getUserId } from "../../middlewares/auth.middleware";
import { sendSuccess } from "../../utils/apiResponse";
import * as todoService from "./todo.service";
import type { BoardInput } from "./todo.types";

export async function getBoard(req: Request, res: Response) {
  sendSuccess(res, await todoService.getBoard(getUserId(req)));
}

export async function saveBoard(req: Request<object, unknown, BoardInput>, res: Response) {
  sendSuccess(res, await todoService.saveBoard(getUserId(req), req.body));
}
