import type { DocumentSnapshot } from "firebase-admin/firestore";
import { recordAudit } from "../../utils/audit";
import { nowIso } from "../../utils/date";
import { decryptJson, encryptJson } from "../../utils/encryption";
import {
  dataOrNotFound,
  includesText,
  paginate,
  userCollection,
  inDateRange,
  whereEquals,
} from "../../utils/firestore";
import { generateRecordId } from "../../utils/token";
import type { StudentDetails, StudentDoc, StudentInput, StudentQuery } from "./student.types";

const students = (userId: string) => userCollection(userId, "students");

// Flat object in the same shape the frontend form uses
function toStudent(doc: DocumentSnapshot) {
  const { details, createdAt: _createdAt, updatedAt: _updatedAt, ...fields } = doc.data() as StudentDoc;
  return { id: doc.id, ...fields, ...decryptJson<StudentDetails>(details) };
}

// Splits the form into plain filter fields and the encrypted details JSON
function toStudentFields(input: StudentInput) {
  const {
    dateEncoded,
    studentName,
    sex,
    gradeSection,
    schoolYear,
    livesWith,
    feelingAboutSchool,
    prefersPrivate,
    signatureReceived,
    followUpNeeded,
    ...details
  } = input;

  return {
    dateEncoded,
    studentName,
    sex,
    gradeSection,
    schoolYear,
    livesWith,
    feelingAboutSchool,
    prefersPrivate,
    signatureReceived,
    followUpNeeded,
    details: encryptJson(details),
    updatedAt: nowIso(),
  };
}

// Newest added first. Dropdown filters run in Firestore; name search and dates run after (see paginate).
export async function listStudents(userId: string, query: StudentQuery) {
  const { page, limit, search, from, to, ...filters } = query;
  const firestoreQuery = whereEquals(students(userId), filters).orderBy("createdAt", "desc");

  const matches =
    search || from
      ? (item: { studentName: string; dateEncoded: string }) =>
          includesText(item.studentName, search) && inDateRange(item.dateEncoded, from, to)
      : undefined;
  const { items, pagination } = await paginate(firestoreQuery, { page, limit }, toStudent, matches);
  return { students: items, pagination };
}

export async function getStudent(userId: string, id: string) {
  const doc = await students(userId).doc(id).get();
  dataOrNotFound(doc, "Student");
  return toStudent(doc);
}

export async function createStudent(userId: string, input: StudentInput) {
  const ref = await students(userId).add({ ...toStudentFields(input), recordId: generateRecordId(), createdAt: nowIso() });
  await recordAudit(userId, "create", "student", ref.id);
  return toStudent(await ref.get());
}

export async function updateStudent(userId: string, id: string, input: StudentInput) {
  const ref = students(userId).doc(id);
  dataOrNotFound(await ref.get(), "Student");

  await ref.update(toStudentFields(input));
  await recordAudit(userId, "update", "student", id);
  return toStudent(await ref.get());
}

export async function deleteStudent(userId: string, id: string) {
  const ref = students(userId).doc(id);
  dataOrNotFound(await ref.get(), "Student");

  await ref.delete();
  await recordAudit(userId, "delete", "student", id);
}
