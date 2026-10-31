import crypto from "node:crypto";
import { FieldValue, type DocumentReference } from "firebase-admin/firestore";
import { db } from "../../config/firebase";
import { ApiError } from "../../utils/apiError";
import { nowIso } from "../../utils/date";
import { decrypt, decryptJson, encrypt, encryptJson } from "../../utils/encryption";
import { dataOrNotFound, paginate, userCollection } from "../../utils/firestore";
import type { PaginationQuery } from "../../utils/pagination";
import { hashToken } from "../../utils/token";
import { getForm } from "./form.service";
import type { AnswerEntry, FormDoc, FormInput, FormLinkDoc, FormResponseDoc } from "./form.types";

// Public answer links, export counts and responses of a form.
// A link opens users/{userId}/forms/{formId} through formLinks/{sha256(code)}, so the code itself
// is never stored in plain text (the form keeps it encrypted to show it to its owner again).

const formLinks = db.collection("formLinks");
const formRef = (userId: string, formId: string) => userCollection(userId, "forms").doc(formId);
const responses = (userId: string, formId: string) => formRef(userId, formId).collection("responses");

async function readFormDoc(ref: DocumentReference) {
  return dataOrNotFound<FormDoc>(await ref.get(), "Form");
}

// ---- Owner (signed in) ----

// Link code (or null), export counts and number of answers received through the link
export async function getSummary(userId: string, formId: string) {
  const ref = formRef(userId, formId);
  const [form, count] = await Promise.all([readFormDoc(ref), responses(userId, formId).count().get()]);
  return {
    code: form.link ? decrypt(form.link) : null,
    exports: { pdf: form.exports?.pdf ?? 0, word: form.exports?.word ?? 0 },
    responseCount: count.data().count,
  };
}

// Turns the public link on (keeps the same code if it already exists)
export async function createLink(userId: string, formId: string) {
  const ref = formRef(userId, formId);
  const form = await readFormDoc(ref);
  if (form.status === "draft") throw new ApiError(400, "Save the form before sharing it.");
  if (form.link) return { code: decrypt(form.link) };

  const code = crypto.randomBytes(18).toString("base64url");
  const link: FormLinkDoc = { userId, formId, createdAt: nowIso() };
  const batch = db.batch();
  batch.set(formLinks.doc(hashToken(code)), link);
  batch.update(ref, { link: encrypt(code) });
  await batch.commit();
  return { code };
}

// Turns the public link off: the old code stops working (answers already received are kept)
export async function removeLink(userId: string, formId: string) {
  const ref = formRef(userId, formId);
  const form = await readFormDoc(ref);
  if (!form.link) return;
  const batch = db.batch();
  batch.delete(formLinks.doc(hashToken(decrypt(form.link))));
  batch.update(ref, { link: null });
  await batch.commit();
}

export async function recordExport(userId: string, formId: string, format: "pdf" | "word") {
  const ref = formRef(userId, formId);
  await readFormDoc(ref);
  await ref.update({ [`exports.${format}`]: FieldValue.increment(1) });
}

// Newest first
export async function listResponses(userId: string, formId: string, pagination: PaginationQuery) {
  await readFormDoc(formRef(userId, formId));
  const { items, pagination: meta } = await paginate(
    responses(userId, formId).orderBy("submittedAt", "desc"),
    pagination,
    (doc) => {
      const raw = doc.data() as FormResponseDoc;
      return { id: doc.id, submittedAt: raw.submittedAt, answers: decryptJson<AnswerEntry[]>(raw.data) };
    },
  );
  return { responses: items, pagination: meta };
}

// ---- Public link (no sign-in) ----

const NOT_AVAILABLE = "This form link is no longer available. Please ask for a new link.";

async function findByCode(code: string) {
  const link = await formLinks.doc(hashToken(code)).get();
  if (!link.exists) throw new ApiError(404, NOT_AVAILABLE);
  const { userId, formId } = link.data() as FormLinkDoc;
  const form = await getForm(userId, formId).catch(() => {
    throw new ApiError(404, NOT_AVAILABLE);
  });
  return { userId, formId, form };
}

// What the person answering sees: only the form's content (no owner, ids of records or dates)
export async function getPublicForm(code: string) {
  const { form } = await findByCode(code);
  const { title, description, header, questions } = form;
  return { title, description, header, questions };
}

const answerable = (item: FormInput["questions"][number]) => item.type !== "section" && item.type !== "file";
const isEmpty = (value: string | string[] | undefined) =>
  value === undefined || (Array.isArray(value) ? value.every((part) => !part.trim()) : !value.trim());

// Checks the answers against the form and keeps only real answers to its own questions
function checkAnswers(form: FormInput, answers: Record<string, string | string[]>): AnswerEntry[] {
  const entries: AnswerEntry[] = [];
  for (const item of [...form.header, ...form.questions].filter(answerable)) {
    const value = answers[item.id];
    if (isEmpty(value)) {
      if (item.required) throw new ApiError(400, `Please answer: ${item.label}`);
      continue;
    }
    const invalid = () => new ApiError(400, `Please check your answer to: ${item.label}`);

    if (item.type === "checkbox") {
      if (!Array.isArray(value) || value.some((option) => !item.options.includes(option))) throw invalid();
    } else if (item.type === "text" && item.parts.length) {
      if (!Array.isArray(value) || value.length !== item.parts.length) throw invalid();
    } else if (typeof value !== "string") {
      throw invalid();
    } else if (["radio", "select"].includes(item.type) && !item.options.includes(value)) {
      throw invalid();
    } else if (item.type !== "textarea" && value.length > 500) {
      throw invalid();
    }
    entries.push({ id: item.id, label: item.label, value: Array.isArray(value) ? value.map((part) => part.trim()) : value.trim() });
  }
  return entries;
}

export async function submitAnswers(code: string, answers: Record<string, string | string[]>) {
  const { userId, formId, form } = await findByCode(code);
  const entries = checkAnswers(form, answers);
  if (!entries.length) throw new ApiError(400, "Please answer at least one question.");
  const response: FormResponseDoc = { data: encryptJson(entries), submittedAt: nowIso() };
  await responses(userId, formId).add(response);
  return { submitted: true };
}
