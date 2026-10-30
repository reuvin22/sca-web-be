import type { DocumentSnapshot, Query } from "firebase-admin/firestore";
import { db } from "../config/firebase";
import { ApiError } from "./apiError";
import { buildPaginationMeta, toSkipTake, type PaginationQuery } from "./pagination";

type UserCollectionName =
  | "students"
  | "cases"
  | "appointments"
  | "categories"
  | "files"
  | "supportRequests"
  | "auditLogs"
  | "todo";

export const usersCollection = db.collection("users");

// Every record lives under its owner: users/{userId}/{collection}/{id}.
// Services only use this path, so a user can never reach another user's records.
export function userCollection(userId: string, name: UserCollectionName) {
  return usersCollection.doc(userId).collection(name);
}

// Reads a document's data, or throws 404 when it does not exist
export function dataOrNotFound<T>(doc: DocumentSnapshot, label: string): T {
  if (!doc.exists) throw new ApiError(404, `${label} not found`);
  return doc.data() as T;
}

// Adds exact-match filters for every value that was sent (undefined = no filter)
export function whereEquals(query: Query, filters: Record<string, string | undefined>) {
  return Object.entries(filters).reduce((result, [field, value]) => (value ? result.where(field, "==", value) : result), query);
}

// "YYYY-MM-DD" range on a field. Only `from` means that single day.
export function whereDateRange(query: Query, field: string, from: string, to: string) {
  if (!from) return query;
  return query.where(field, ">=", from).where(field, "<=", to || from);
}

// Firestore cannot search inside text, so name search is done here after the query.
export const includesText = (value: string, search: string) =>
  !search || value.toLowerCase().includes(search.toLowerCase());

// Paginates a Firestore query (max 15 per page).
// - Without `keep`: Firestore does the paging (offset/limit) and the count.
// - With `keep` (a filter Firestore can't do, e.g. text search): all matches are loaded, filtered, then paged here.
export async function paginate<T>(
  query: Query,
  pagination: PaginationQuery,
  toItem: (doc: DocumentSnapshot) => T,
  keep?: (item: T) => boolean,
) {
  const { skip, take } = toSkipTake(pagination);

  if (keep) {
    const snapshot = await query.get();
    const items = snapshot.docs.map(toItem).filter(keep);
    return { items: items.slice(skip, skip + take), pagination: buildPaginationMeta(pagination, items.length) };
  }

  const [page, count] = await Promise.all([query.offset(skip).limit(take).get(), query.count().get()]);
  return { items: page.docs.map(toItem), pagination: buildPaginationMeta(pagination, count.data().count) };
}
