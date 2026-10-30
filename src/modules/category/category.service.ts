import type { DocumentSnapshot } from "firebase-admin/firestore";
import { ApiError } from "../../utils/apiError";
import { invalidateCache } from "../../utils/cache";
import { nowIso } from "../../utils/date";
import { dataOrNotFound, paginate, userCollection } from "../../utils/firestore";
import type { PaginationQuery } from "../../utils/pagination";
import type { CategoryDoc, CreateCategoryInput, UpdateOptionsInput } from "./category.types";

export const CATEGORY_CACHE_PREFIX = "categories";

const categories = (userId: string) => userCollection(userId, "categories");
const clearCache = (userId: string) => invalidateCache(`${CATEGORY_CACHE_PREFIX}:${userId}`);

function toCategory(doc: DocumentSnapshot) {
  const { name, options } = doc.data() as CategoryDoc;
  return { id: doc.id, name, options };
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

// Category names are unique per user (they link to form fields by name)
async function assertNameIsFree(userId: string, name: string, exceptId?: string) {
  const sameName = await categories(userId).where("name", "==", name).limit(2).get();
  if (sameName.docs.some((doc) => doc.id !== exceptId)) {
    throw new ApiError(409, "A category with this name already exists");
  }
}

export async function createCategory(userId: string, input: CreateCategoryInput) {
  await assertNameIsFree(userId, input.name);

  const category: CategoryDoc = { name: input.name, options: [], createdAt: nowIso() };
  const ref = await categories(userId).add(category);
  clearCache(userId);
  return { id: ref.id, name: category.name, options: category.options };
}

export async function renameCategory(userId: string, id: string, input: CreateCategoryInput) {
  const ref = categories(userId).doc(id);
  dataOrNotFound(await ref.get(), "Category");
  await assertNameIsFree(userId, input.name, id);

  await ref.update({ name: input.name });
  clearCache(userId);
  return toCategory(await ref.get());
}

export async function updateOptions(userId: string, id: string, input: UpdateOptionsInput) {
  const ref = categories(userId).doc(id);
  dataOrNotFound(await ref.get(), "Category");

  await ref.update({ options: input.options });
  clearCache(userId);
  return toCategory(await ref.get());
}

export async function deleteCategory(userId: string, id: string) {
  const ref = categories(userId).doc(id);
  dataOrNotFound(await ref.get(), "Category");

  await ref.delete();
  clearCache(userId);
}
