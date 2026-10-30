import { todayString } from "../../utils/date";
import type { CaseStatus } from "./case.types";

// Same rule as the frontend's getCaseStatus: the status set by the counselor wins;
// otherwise it is based on the follow-up date (before today = overdue, today = today, after = scheduled).
export function getCaseStatus(item: { status: string; followUpDate: string }): CaseStatus {
  if (item.status) return item.status as CaseStatus;

  const today = todayString();
  if (item.followUpDate < today) return "overdue";
  if (item.followUpDate === today) return "today";
  return "scheduled";
}
