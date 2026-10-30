import { nowIso } from "../../utils/date";
import { userCollection } from "../../utils/firestore";
import type { SupportRequestInput } from "./support.types";

export async function createSupportRequest(userId: string, input: SupportRequestInput) {
  const request = {
    type: input.type,
    subject: input.subject,
    description: input.description,
    severity: input.type === "bug" ? input.severity : null,
    createdAt: nowIso(),
  };
  const ref = await userCollection(userId, "supportRequests").add(request);
  return { id: ref.id, ...request };
}
