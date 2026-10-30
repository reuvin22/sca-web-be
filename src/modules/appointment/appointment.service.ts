import type { DocumentSnapshot } from "firebase-admin/firestore";
import { recordAudit } from "../../utils/audit";
import { nowIso } from "../../utils/date";
import { decryptOptional, encryptOptional } from "../../utils/encryption";
import { dataOrNotFound, includesText, paginate, userCollection, whereEquals } from "../../utils/firestore";
import { generateAppointmentId } from "../../utils/token";
import type { AppointmentDoc, AppointmentInput, AppointmentQuery } from "./appointment.types";

const appointments = (userId: string) => userCollection(userId, "appointments");

function toAppointment(doc: DocumentSnapshot) {
  const { createdAt: _c, updatedAt: _u, dateTime: _d, notes, ...fields } = doc.data() as AppointmentDoc;
  return { id: doc.id, ...fields, notes: decryptOptional(notes) };
}

function toAppointmentFields(input: AppointmentInput) {
  return {
    ...input,
    dateTime: `${input.date} ${input.time}`,
    notes: encryptOptional(input.notes),
    updatedAt: nowIso(),
  };
}

// Earliest first, like the frontend's appointment list.
// Status, staff and dates run in Firestore; name search runs after (see paginate).
export async function listAppointments(userId: string, query: AppointmentQuery) {
  const { page, limit, search, from, to, status, staff } = query;
  // dateTime ("YYYY-MM-DD HH:MM") sorts by date then time, and works for the date range too.
  let firestoreQuery = whereEquals(appointments(userId), { status, staff });
  if (from) {
    firestoreQuery = firestoreQuery.where("dateTime", ">=", from).where("dateTime", "<=", `${to || from} 99:99`);
  }
  firestoreQuery = firestoreQuery.orderBy("dateTime", "asc");

  const nameMatches = search ? (item: { studentName: string }) => includesText(item.studentName, search) : undefined;
  const { items, pagination } = await paginate(firestoreQuery, { page, limit }, toAppointment, nameMatches);
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
