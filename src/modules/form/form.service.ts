import type { DocumentSnapshot } from "firebase-admin/firestore";
import { recordAudit } from "../audit/audit.service";
import { nowIso } from "../../utils/date";
import { db } from "../../config/firebase";
import { decrypt, decryptJson, encryptJson } from "../../utils/encryption";
import { hashToken } from "../../utils/token";
import { dataOrNotFound, includesText, paginate, userCollection } from "../../utils/firestore";
import type { FormDoc, FormInput, FormQuery } from "./form.types";

const forms = (userId: string) => userCollection(userId, "forms");

function toForm(doc: DocumentSnapshot) {
  const raw = doc.data() as FormDoc;
  const form = decryptJson<FormInput>(raw.data);
  // Older forms may have no header or questions yet
  return {
    id: doc.id,
    ...form,
    header: form.header ?? [],
    questions: form.questions ?? [],
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

// Newest first. Titles are encrypted, so search runs after decrypting (see paginate).
export async function listForms(userId: string, { page, limit, search }: FormQuery) {
  const matches = search ? (item: ReturnType<typeof toForm>) => includesText(item.title, search) : undefined;
  const { items, pagination } = await paginate(forms(userId).orderBy("createdAt", "desc"), { page, limit }, toForm, matches);
  return { forms: items, pagination };
}

export async function getForm(userId: string, id: string) {
  const doc = await forms(userId).doc(id).get();
  dataOrNotFound(doc, "Form");
  return toForm(doc);
}

export async function createForm(userId: string, input: FormInput) {
  const now = nowIso();
  const form: FormDoc = { data: encryptJson(input), createdAt: now, updatedAt: now };
  const ref = await forms(userId).add(form);
  await recordAudit(userId, "create", "form", ref.id);
  return toForm(await ref.get());
}

export async function updateForm(userId: string, id: string, input: FormInput) {
  const ref = forms(userId).doc(id);
  dataOrNotFound<FormDoc>(await ref.get(), "Form");
  // update (not set) keeps the public link and export counts
  await ref.update({ data: encryptJson(input), updatedAt: nowIso() });
  await recordAudit(userId, "update", "form", id);
  return toForm(await ref.get());
}

// Also turns off its public link and deletes the answers received through it
export async function deleteForm(userId: string, id: string) {
  const ref = forms(userId).doc(id);
  const form = dataOrNotFound<FormDoc>(await ref.get(), "Form");
  if (form.link) await db.collection("formLinks").doc(hashToken(decrypt(form.link))).delete();
  await db.recursiveDelete(ref);
  await recordAudit(userId, "delete", "form", id);
}
