import { userCollection } from "./firestore";

type AuditAction = "create" | "update" | "delete" | "download";
type AuditEntity = "student" | "case" | "appointment" | "file";

// Records who touched a sensitive record. Never pass record content here.
export async function recordAudit(userId: string, action: AuditAction, entity: AuditEntity, entityId: string) {
  await userCollection(userId, "auditLogs").add({ action, entity, entityId, createdAt: new Date().toISOString() });
}
