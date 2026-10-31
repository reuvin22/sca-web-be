import type { Request, Response } from "express";
import { getUserId } from "../../middlewares/auth.middleware";
import { sendSuccess } from "../../utils/apiResponse";
import * as reportService from "./report.service";
import type { PeriodQuery } from "./report.validator";

export async function getDashboard(req: Request, res: Response) {
  sendSuccess(res, await reportService.getDashboard(getUserId(req)));
}

export async function getSummary(req: Request, res: Response) {
  sendSuccess(res, await reportService.getSummary(getUserId(req)));
}

export async function getPeriodReport(req: Request, res: Response) {
  sendSuccess(res, await reportService.getPeriodReport(getUserId(req), req.query as unknown as PeriodQuery));
}

export async function getNotifications(req: Request, res: Response) {
  sendSuccess(res, await reportService.getNotifications(getUserId(req)));
}
