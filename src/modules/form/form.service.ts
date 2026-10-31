import { FieldValue, type DocumentSnapshot } from "firebase-admin/firestore";
import { recordAudit } from "../audit/audit.service";
import { nowIso } from "../../utils/date";
import { db } from "../../config/firebase";
import { decrypt, decryptJson, encryptJson } from "../../utils/encryption";
import { hashToken } from "../../utils/token";
import { dataOrNotFound, includesText, paginate, userCollection } from "../../utils/firestore";
import type { FormDoc, FormInput, FormQuery } from "./form.types";

const forms = (userId: string) => userCollection(userId, "forms");

const withLists = (form: FormInput) => ({ ...form, header: form.header ?? [], questions: form.questions ?? [] });

// `draft`: never saved yet. `hasPendingChanges`: a saved form with unsaved changes kept from last time.
function toForm(doc: DocumentSnapshot) {
  const raw = doc.data() as FormDoc;
  return {
    id: doc.id,
    ...withLists(decryptJson<FormInput>(raw.data)),
    draft: raw.status === "draft",
    hasPendingChanges: Boolean(raw.pending),
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

// For the builder: also the unsaved changes kept from last time (`pendingChanges`), if any
export async function getForm(userId: string, id: string) {
  const doc = await forms(userId).doc(id).get();
  const raw = dataOrNotFound<FormDoc>(doc, "Form");
  return { ...toForm(doc), pendingChanges: raw.pending ? withLists(decryptJson<FormInput>(raw.pending)) : null };
}

// Keeps unfinished work when the user leaves the builder without saving.
// New form: created as a draft. Draft: updated. Saved form: the changes are kept aside (`pending`), so the
// saved version (and its answer link) stays as it is until the user saves.
export async function saveDraft(userId: string, id: string | null, input: FormInput) {
  const now = nowIso();
  if (!id) {
    const ref = await forms(userId).add({ data: encryptJson(input), status: "draft", createdAt: now, updatedAt: now } satisfies FormDoc);
    return toForm(await ref.get());
  }
  const ref = forms(userId).doc(id);
  const form = dataOrNotFound<FormDoc>(await ref.get(), "Form");
  if (form.status === "draft") await ref.update({ data: encryptJson(input), updatedAt: now });
  else await ref.update({ pending: encryptJson(input) });
  return toForm(await ref.get());
}

// Drops the unsaved changes of a saved form
export async function discardPending(userId: string, id: string) {
  const ref = forms(userId).doc(id);
  dataOrNotFound<FormDoc>(await ref.get(), "Form");
  await ref.update({ pending: null });
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
  // update (not set) keeps the public link and export counts. Saving publishes a draft and its pending changes.
  await ref.update({ data: encryptJson(input), status: FieldValue.delete(), pending: null, updatedAt: nowIso() });
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
