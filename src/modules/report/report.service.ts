import { todayString } from "../../utils/date";
import { userCollection } from "../../utils/firestore";
import { MAX_PAGE_SIZE } from "../../utils/pagination";
import { getCaseStatus } from "../case/case.status";
import type { CaseDoc } from "../case/case.types";
import type { AppointmentDoc } from "../appointment/appointment.types";
import { countBy, countByMonth, workloadByStaff } from "./report.helpers";

// Raw counts for the Dashboard and Reports pages. The frontend turns them into charts.
// Only names, IDs and dates are loaded, never remarks or notes.

const CASE_FIELDS = [
  "caseNumber",
  "intakeDate",
  "learnerName",
  "gradeSection",
  "concern",
  "referredTo",
  "classification",
  "followUpDate",
  "status",
] as const;
const APPOINTMENT_FIELDS = ["appointmentId", "studentName", "staff", "date", "time", "status"] as const;

type CaseSummary = Pick<CaseDoc, (typeof CASE_FIELDS)[number]> & { id: string };
type AppointmentSummary = Pick<AppointmentDoc, (typeof APPOINTMENT_FIELDS)[number]> & { id: string };

async function loadCases(userId: string): Promise<CaseSummary[]> {
  const snapshot = await userCollection(userId, "cases").select(...CASE_FIELDS).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<CaseSummary, "id">) }));
}

async function loadAppointments(userId: string): Promise<AppointmentSummary[]> {
  const snapshot = await userCollection(userId, "appointments").select(...APPOINTMENT_FIELDS).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<AppointmentSummary, "id">) }));
}

const isReferred = (item: CaseSummary) => item.referredTo !== "" && item.referredTo !== "Not Referred";

export async function getDashboard(userId: string) {
  const cases = await loadCases(userId);
  const today = todayString();
  const statusCount = (...statuses: string[]) =>
    cases.filter((item) => statuses.includes(getCaseStatus(item))).length;

  // Last 6 months and last 7 days (by intake date)
  const sixMonthsAgo = new Date(`${today.slice(0, 7)}-01T00:00:00.000Z`);
  sixMonthsAgo.setUTCMonth(sixMonthsAgo.getUTCMonth() - 5);
  const monthStart = sixMonthsAgo.toISOString().slice(0, 10);
  const weekStart = todayString(-6);

  return {
    caseStats: {
      total: cases.length,
      forFollowUp: statusCount("today", "scheduled"),
      overdue: statusCount("overdue"),
      closed: statusCount("accomplished"),
      thisMonth: cases.filter((item) => item.intakeDate.startsWith(today.slice(0, 7))).length,
      referrals: cases.filter(isReferred).length,
    },
    casesPerMonth: countByMonth(cases.map((item) => item.intakeDate).filter((date) => date >= monthStart)),
    casesPerDay: countBy(
      cases.filter((item) => item.intakeDate >= weekStart && item.intakeDate <= today),
      (item) => item.intakeDate,
    ).map(({ label, count }) => ({ date: label, count })),
    classifications: countBy(cases, (item) => item.classification, 3),
    concerns: countBy(cases, (item) => item.concern, 5),
    gradeSections: countBy(cases, (item) => item.gradeSection, 3),
    // Follow-ups from today onward that aren't accomplished, earliest first
    upcomingFollowUps: cases
      .filter((item) => item.followUpDate >= today && getCaseStatus(item) !== "accomplished")
      .sort((a, b) => a.followUpDate.localeCompare(b.followUpDate))
      .slice(0, 5)
      .map(({ id, caseNumber, learnerName, gradeSection, followUpDate }) => ({
        id,
        caseNumber,
        learnerName,
        gradeSection,
        followUpDate,
      })),
  };
}

export async function getSummary(userId: string) {
  const [cases, appointments] = await Promise.all([loadCases(userId), loadAppointments(userId)]);
  const completed = cases.filter((item) => getCaseStatus(item) === "accomplished").length;

  return {
    cases: { total: cases.length, completed, pending: cases.length - completed },
    appointmentsByMonth: countByMonth(appointments.map((item) => item.date)),
    referrals: countBy(cases.filter(isReferred), (item) => item.referredTo),
    workload: workloadByStaff(appointments),
  };
}

// Overdue and due-today follow-ups, and scheduled appointments today or tomorrow
export async function getNotifications(userId: string) {
  const [cases, appointments] = await Promise.all([loadCases(userId), loadAppointments(userId)]);
  const today = todayString();
  const tomorrow = todayString(1);

  const casesWithStatus = (status: string) =>
    cases
      .filter((item) => getCaseStatus(item) === status)
      .sort((a, b) => a.followUpDate.localeCompare(b.followUpDate))
      .slice(0, MAX_PAGE_SIZE)
      .map(({ id, caseNumber, learnerName, followUpDate }) => ({ id, caseNumber, learnerName, followUpDate }));

  return {
    overdue: casesWithStatus("overdue"),
    dueToday: casesWithStatus("today"),
    upcomingAppointments: appointments
      .filter((item) => item.status === "scheduled" && (item.date === today || item.date === tomorrow))
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
      .slice(0, MAX_PAGE_SIZE),
  };
}
