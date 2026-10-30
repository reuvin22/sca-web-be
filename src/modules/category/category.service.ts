import type { DocumentSnapshot } from "firebase-admin/firestore";
import { ApiError } from "../../utils/apiError";
import { invalidateCache } from "../../utils/cache";
import { nowIso } from "../../utils/date";
import { decryptJson, encryptJson, isSealed } from "../../utils/encryption";
import { dataOrNotFound, paginate, userCollection } from "../../utils/firestore";
import type { PaginationQuery } from "../../utils/pagination";
import type { Category, CategoryDoc, CreateCategoryInput, LegacyCategoryDoc, UpdateOptionsInput } from "./category.types";

export const CATEGORY_CACHE_PREFIX = "categories";

const categories = (userId: string) => userCollection(userId, "categories");
const clearCache = (userId: string) => invalidateCache(`${CATEGORY_CACHE_PREFIX}:${userId}`);

// Name and options are encrypted together; only the created time stays plain (for sorting)
export const toCategoryDoc = (category: Category, createdAt: string): CategoryDoc => ({
  data: encryptJson(category),
  createdAt,
});

function readCategory(raw: CategoryDoc | LegacyCategoryDoc): Category {
  if (isSealed(raw)) return decryptJson<Category>(raw.data);
  return { name: raw.name, options: raw.options };
}

function toCategory(doc: DocumentSnapshot) {
  return { id: doc.id, ...readCategory(doc.data() as CategoryDoc | LegacyCategoryDoc) };
}

async function getCategoryDoc(userId: string, id: string) {
  const ref = categories(userId).doc(id);
  const raw = dataOrNotFound<CategoryDoc | LegacyCategoryDoc>(await ref.get(), "Category");
  return { ref, raw, category: readCategory(raw) };
}

// Newest first, so a new category shows at the top of the Settings page
export async function listCategories(userId: string, pagination: PaginationQuery) {
  const { items, pagination: meta } = await paginate(
    categories(userId).orderBy("createdAt", "desc"),
    pagination,
    toCategory,
  );
  return { categories: items, pagination: meta };
}

// Category names are unique per user (they link to form fields by name).
// Names are encrypted, so the check runs here after decrypting (a user has a few dozen at most).
async function assertNameIsFree(userId: string, name: string, exceptId?: string) {
  const snapshot = await categories(userId).get();
  if (snapshot.docs.some((doc) => doc.id !== exceptId && toCategory(doc).name === name)) {
    throw new ApiError(409, "A category with this name already exists");
  }
}

export async function createCategory(userId: string, input: CreateCategoryInput) {
  await assertNameIsFree(userId, input.name);

  const category: Category = { name: input.name, options: [] };
  const ref = await categories(userId).add(toCategoryDoc(category, nowIso()));
  clearCache(userId);
  return { id: ref.id, ...category };
}

export async function renameCategory(userId: string, id: string, input: CreateCategoryInput) {
  const { ref, raw, category } = await getCategoryDoc(userId, id);
  await assertNameIsFree(userId, input.name, id);

  const renamed = { ...category, name: input.name };
  await ref.set(toCategoryDoc(renamed, raw.createdAt));
  clearCache(userId);
  return { id, ...renamed };
}

export async function updateOptions(userId: string, id: string, input: UpdateOptionsInput) {
  const { ref, raw, category } = await getCategoryDoc(userId, id);

  const updated = { ...category, options: input.options };
  await ref.set(toCategoryDoc(updated, raw.createdAt));
  clearCache(userId);
  return { id, ...updated };
}

export async function deleteCategory(userId: string, id: string) {
  const { ref } = await getCategoryDoc(userId, id);

  await ref.delete();
  clearCache(userId);
}
