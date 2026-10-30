import type { DocumentSnapshot } from "firebase-admin/firestore";
import { recordAudit } from "../audit/audit.service";
import { nowIso } from "../../utils/date";
import { decryptJson, encryptJson, isSealed } from "../../utils/encryption";
import { dataOrNotFound, includesText, paginate, userCollection, inDateRange } from "../../utils/firestore";
import { generateRecordId } from "../../utils/token";
import type { LegacyStudentDoc, StudentDetails, StudentDoc, StudentInput, StudentQuery } from "./student.types";

const students = (userId: string) => userCollection(userId, "students");

// The whole student form is encrypted; only the record ID and times stay plain
function readStudent(raw: StudentDoc | LegacyStudentDoc): StudentInput {
  if (isSealed(raw)) return decryptJson<StudentInput>(raw.data);

  // Older records: filter fields were plain and the rest was encrypted as `details`
  const { details, recordId: _recordId, createdAt: _createdAt, updatedAt: _updatedAt, ...fields } = raw;
  return { ...fields, ...decryptJson<StudentDetails>(details) };
}

// Flat object in the same shape the frontend form uses
function toStudent(doc: DocumentSnapshot) {
  const raw = doc.data() as StudentDoc | LegacyStudentDoc;
  return { id: doc.id, recordId: raw.recordId, ...readStudent(raw) };
}

// Newest added first. Fields are encrypted, so search, dates and dropdown filters run
// here after decrypting (see paginate).
export async function listStudents(userId: string, query: StudentQuery) {
  const { page, limit, search, from, to, ...filters } = query;
  const activeFilters = Object.entries(filters).filter(([, value]) => value) as [keyof StudentInput, string][];

  const matches =
    search || from || activeFilters.length
      ? (item: ReturnType<typeof toStudent>) =>
          includesText(item.studentName, search) &&
          inDateRange(item.dateEncoded, from, to) &&
          activeFilters.every(([field, value]) => item[field] === value)
      : undefined;
  const { items, pagination } = await paginate(
    students(userId).orderBy("createdAt", "desc"),
    { page, limit },
    toStudent,
    matches,
  );
  return { students: items, pagination };
}

export async function getStudent(userId: string, id: string) {
  const doc = await students(userId).doc(id).get();
  dataOrNotFound(doc, "Student");
  return toStudent(doc);
}

export async function createStudent(userId: string, input: StudentInput) {
  const now = nowIso();
  const student: StudentDoc = { recordId: generateRecordId(), data: encryptJson(input), createdAt: now, updatedAt: now };
  const ref = await students(userId).add(student);
  await recordAudit(userId, "create", "student", ref.id);
  return toStudent(await ref.get());
}

export async function updateStudent(userId: string, id: string, input: StudentInput) {
  const ref = students(userId).doc(id);
  const old = dataOrNotFound<StudentDoc | LegacyStudentDoc>(await ref.get(), "Student");

  // set (not update) replaces the whole document, so an older record loses its plain fields
  const student: StudentDoc = {
    recordId: old.recordId,
    data: encryptJson(input),
    createdAt: old.createdAt,
    updatedAt: nowIso(),
  };
  await ref.set(student);
  await recordAudit(userId, "update", "student", id);
  return toStudent(await ref.get());
}

export async function deleteStudent(userId: string, id: string) {
  const ref = students(userId).doc(id);
  dataOrNotFound(await ref.get(), "Student");

  await ref.delete();
  await recordAudit(userId, "delete", "student", id);
}
