import type { Request, Response } from "express";
import { getUserId } from "../../middlewares/auth.middleware";
import { sendSuccess } from "../../utils/apiResponse";
import type { IdParams } from "../../utils/schema";
import * as appointmentService from "./appointment.service";
import type { AppointmentInput, AppointmentQuery } from "./appointment.types";

export async function listAppointments(req: Request, res: Response) {
  // validate() already parsed the query
  const query = req.query as unknown as AppointmentQuery;
  const { appointments, pagination } = await appointmentService.listAppointments(getUserId(req), query);
  sendSuccess(res, appointments, 200, pagination);
}

export async function getAppointment(req: Request<IdParams>, res: Response) {
  sendSuccess(res, await appointmentService.getAppointment(getUserId(req), req.params.id));
}

export async function createAppointment(req: Request<object, unknown, AppointmentInput>, res: Response) {
  sendSuccess(res, await appointmentService.createAppointment(getUserId(req), req.body), 201);
}

export async function updateAppointment(req: Request<IdParams, unknown, AppointmentInput>, res: Response) {
  sendSuccess(res, await appointmentService.updateAppointment(getUserId(req), req.params.id, req.body));
}

export async function deleteAppointment(req: Request<IdParams>, res: Response) {
  await appointmentService.deleteAppointment(getUserId(req), req.params.id);
  res.status(204).send();
}
