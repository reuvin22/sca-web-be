import type { DocumentSnapshot } from "firebase-admin/firestore";
import { recordAudit } from "../audit/audit.service";
import { nowIso } from "../../utils/date";
import { decryptJson, decryptOptional, encryptJson, isSealed } from "../../utils/encryption";
import { dataOrNotFound, inDateRange, includesText, paginate, userCollection } from "../../utils/firestore";
import { generateAppointmentId } from "../../utils/token";
import type { AppointmentDoc, AppointmentInput, AppointmentQuery, LegacyAppointmentDoc } from "./appointment.types";

const appointments = (userId: string) => userCollection(userId, "appointments");

// The whole appointment is encrypted; only the appointment ID and times stay plain
export function readAppointment(raw: AppointmentDoc | LegacyAppointmentDoc): AppointmentInput {
  if (isSealed(raw)) return decryptJson<AppointmentInput>(raw.data);

  // Older records: plain fields with only the notes encrypted
  const { appointmentId: _id, createdAt: _c, updatedAt: _u, notes, ...fields } = raw;
  return { ...fields, notes: decryptOptional(notes) };
}

function toAppointment(doc: DocumentSnapshot) {
  const raw = doc.data() as AppointmentDoc | LegacyAppointmentDoc;
  return { id: doc.id, appointmentId: raw.appointmentId, ...readAppointment(raw) };
}

// Newest added first. Fields are encrypted, so search, dates, status and staff run here
// after decrypting (see paginate).
export async function listAppointments(userId: string, query: AppointmentQuery) {
  const { page, limit, search, from, to, status, staff } = query;

  const matches =
    search || from || status || staff
      ? (item: ReturnType<typeof toAppointment>) =>
          includesText(item.studentName, search) &&
          inDateRange(item.date, from, to) &&
          (!status || item.status === status) &&
          (!staff || item.staff === staff)
      : undefined;
  const { items, pagination } = await paginate(
    appointments(userId).orderBy("createdAt", "desc"),
    { page, limit },
    toAppointment,
    matches,
  );
  return { appointments: items, pagination };
}

export async function getAppointment(userId: string, id: string) {
  const doc = await appointments(userId).doc(id).get();
  dataOrNotFound(doc, "Appointment");
  return toAppointment(doc);
}

export async function createAppointment(userId: string, input: AppointmentInput) {
  const now = nowIso();
  const appointment: AppointmentDoc = {
    appointmentId: generateAppointmentId(),
    data: encryptJson(input),
    createdAt: now,
    updatedAt: now,
  };
  const ref = await appointments(userId).add(appointment);
  await recordAudit(userId, "create", "appointment", ref.id);
  return toAppointment(await ref.get());
}

export async function updateAppointment(userId: string, id: string, input: AppointmentInput) {
  const ref = appointments(userId).doc(id);
  const old = dataOrNotFound<AppointmentDoc | LegacyAppointmentDoc>(await ref.get(), "Appointment");

  // set (not update) replaces the whole document, so an older record loses its plain fields
  const appointment: AppointmentDoc = {
    appointmentId: old.appointmentId,
    data: encryptJson(input),
    createdAt: old.createdAt,
    updatedAt: nowIso(),
  };
  await ref.set(appointment);
  await recordAudit(userId, "update", "appointment", id);
  return toAppointment(await ref.get());
}

export async function deleteAppointment(userId: string, id: string) {
  const ref = appointments(userId).doc(id);
  dataOrNotFound(await ref.get(), "Appointment");

  await ref.delete();
  await recordAudit(userId, "delete", "appointment", id);
}
