import { nowIso } from "../../utils/date";
import { paginate, userCollection } from "../../utils/firestore";
import { sendEmail } from "../../utils/mailer";
import type { PaginationQuery } from "../../utils/pagination";
import { unusualActivityEmail } from "../auth/auth.email";
import { getUserInfo } from "../profile/profile.user";

// Activity log per user: users/{userId}/auditLogs. Only what happened, to which kind of record,
// and when — never the record's content. Users can see their own log (Profile → Recent activity).

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "download"
  | "sign-in"
  | "sign-out"
  | "sign-out-all"
  | "password-reset"
  | "role-added";
export type AuditEntity = "student" | "case" | "appointment" | "file" | "account";

interface AuditLogDoc {
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  createdAt: string;
}

// Many deletions or downloads in a short time can mean a stolen account or a mistake,
// so the account owner gets an email when this many happen within the window.
const ALERT_WINDOW_MINUTES = 10;
const ALERT_THRESHOLDS: Partial<Record<AuditAction, number>> = { delete: 10, download: 20 };

const auditLogs = (userId: string) => userCollection(userId, "auditLogs");

async function alertIfUnusual(userId: string, action: AuditAction) {
  const threshold = ALERT_THRESHOLDS[action];
  if (!threshold) return;

  const since = new Date(Date.now() - ALERT_WINDOW_MINUTES * 60 * 1000).toISOString();
  const recent = await auditLogs(userId).where("createdAt", ">=", since).get();
  const count = recent.docs.filter((doc) => (doc.data() as AuditLogDoc).action === action).length;
  if (count !== threshold) return; // email once when the threshold is reached, not on every action after it

  const user = await getUserInfo(userId);
  if (user) await sendEmail({ to: user.email, ...unusualActivityEmail(user.name, action, count, ALERT_WINDOW_MINUTES) });
}

// Records who did what. Never pass record content here. A failed alert email never fails the action.
export async function recordAudit(userId: string, action: AuditAction, entity: AuditEntity, entityId: string) {
  const log: AuditLogDoc = { action, entity, entityId, createdAt: nowIso() };
  await auditLogs(userId).add(log);
  await alertIfUnusual(userId, action).catch((error: unknown) => console.error("Activity alert failed:", error));
}

// The signed-in user's own activity, newest first
export async function listActivity(userId: string, pagination: PaginationQuery) {
  const { items, pagination: meta } = await paginate(
    auditLogs(userId).orderBy("createdAt", "desc"),
    pagination,
    (doc) => ({ id: doc.id, ...(doc.data() as AuditLogDoc) }),
  );
  return { activity: items, pagination: meta };
}
