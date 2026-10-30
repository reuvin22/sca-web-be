import type { DocumentSnapshot } from "firebase-admin/firestore";
import { recordAudit } from "../../utils/audit";
import { nowIso } from "../../utils/date";
import { decryptOptional, encryptOptional } from "../../utils/encryption";
import { dataOrNotFound, inDateRange, includesText, paginate, userCollection, whereEquals } from "../../utils/firestore";
import { generateAppointmentId } from "../../utils/token";
import type { AppointmentDoc, AppointmentInput, AppointmentQuery } from "./appointment.types";

const appointments = (userId: string) => userCollection(userId, "appointments");

function toAppointment(doc: DocumentSnapshot) {
  const { createdAt: _c, updatedAt: _u, notes, ...fields } = doc.data() as AppointmentDoc;
  return { id: doc.id, ...fields, notes: decryptOptional(notes) };
}

function toAppointmentFields(input: AppointmentInput) {
  return { ...input, notes: encryptOptional(input.notes), updatedAt: nowIso() };
}

// Newest added first. Status and staff run in Firestore; name search and dates run after (see paginate).
export async function listAppointments(userId: string, query: AppointmentQuery) {
  const { page, limit, search, from, to, status, staff } = query;
  const firestoreQuery = whereEquals(appointments(userId), { status, staff }).orderBy("createdAt", "desc");

  const matches =
    search || from
      ? (item: { studentName: string; date: string }) =>
          includesText(item.studentName, search) && inDateRange(item.date, from, to)
      : undefined;
  const { items, pagination } = await paginate(firestoreQuery, { page, limit }, toAppointment, matches);
  return { appointments: items, pagination };
}

export async function getAppointment(userId: string, id: string) {
  const doc = await appointments(userId).doc(id).get();
  dataOrNotFound(doc, "Appointment");
  return toAppointment(doc);
}

export async function createAppointment(userId: string, input: AppointmentInput) {
  const ref = await appointments(userId).add({
    ...toAppointmentFields(input),
    appointmentId: generateAppointmentId(),
    createdAt: nowIso(),
  });
  await recordAudit(userId, "create", "appointment", ref.id);
  return toAppointment(await ref.get());
}

export async function updateAppointment(userId: string, id: string, input: AppointmentInput) {
  const ref = appointments(userId).doc(id);
  dataOrNotFound(await ref.get(), "Appointment");

  await ref.update(toAppointmentFields(input));
  await recordAudit(userId, "update", "appointment", id);
  return toAppointment(await ref.get());
}

export async function deleteAppointment(userId: string, id: string) {
  const ref = appointments(userId).doc(id);
  dataOrNotFound(await ref.get(), "Appointment");

  await ref.delete();
  await recordAudit(userId, "delete", "appointment", id);
}
