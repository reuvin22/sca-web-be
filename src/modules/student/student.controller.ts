import type { Request, Response } from "express";
import { getUserId } from "../../middlewares/auth.middleware";
import { sendSuccess } from "../../utils/apiResponse";
import type { IdParams } from "../../utils/schema";
import * as studentService from "./student.service";
import type { StudentInput, StudentQuery } from "./student.types";

export async function listStudents(req: Request, res: Response) {
  // validate() already parsed the query
  const query = req.query as unknown as StudentQuery;
  const { students, pagination } = await studentService.listStudents(getUserId(req), query);
  sendSuccess(res, students, 200, pagination);
}

export async function getStudent(req: Request<IdParams>, res: Response) {
  sendSuccess(res, await studentService.getStudent(getUserId(req), req.params.id));
}

export async function createStudent(req: Request<object, unknown, StudentInput>, res: Response) {
  sendSuccess(res, await studentService.createStudent(getUserId(req), req.body), 201);
}

export async function updateStudent(req: Request<IdParams, unknown, StudentInput>, res: Response) {
  sendSuccess(res, await studentService.updateStudent(getUserId(req), req.params.id, req.body));
}

export async function deleteStudent(req: Request<IdParams>, res: Response) {
  await studentService.deleteStudent(getUserId(req), req.params.id);
  res.status(204).send();
}
