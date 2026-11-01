import { todayString } from "../../utils/date";
import { userCollection } from "../../utils/firestore";
import { MAX_PAGE_SIZE } from "../../utils/pagination";
import { getCaseStatus } from "../case/case.status";
import { decryptCase } from "../case/case.crypto";
import type { CaseDoc, CaseInput, LegacyCaseDoc } from "../case/case.types";
import { readAppointment } from "../appointment/appointment.service";
import type { AppointmentDoc, AppointmentInput, LegacyAppointmentDoc } from "../appointment/appointment.types";
import * as notificationService from "../notification/notification.service";
import * as updateService from "../update/update.service";
import { countBy, countByMonth, workloadByStaff } from "./report.helpers";
import type { PeriodQuery } from "./report.validator";

// Raw counts for the Dashboard and Reports pages. The frontend turns them into charts.
// Only names, IDs and dates are returned, never remarks or notes.


type CaseSummary = Omit<CaseInput, "remarks"> & { id: string; caseNumber: string };
type AppointmentSummary = Pick<AppointmentInput, "studentName" | "staff" | "date" | "time" | "status"> & {
  id: string;
  appointmentId: string;
};

// Cases are encrypted, so they are decrypted here; remarks are dropped right away.
async function loadCases(userId: string): Promise<CaseSummary[]> {
  const snapshot = await userCollection(userId, "cases").get();
  return snapshot.docs.map((doc) => {
    const raw = doc.data() as CaseDoc | LegacyCaseDoc;
    const { remarks: _remarks, ...fields } = decryptCase(raw);
    return { id: doc.id, caseNumber: raw.caseNumber, ...fields };
  });
}

// Appointments are encrypted too; only the fields the reports need are kept (never the notes)
async function loadAppointments(userId: string): Promise<AppointmentSummary[]> {
  const snapshot = await userCollection(userId, "appointments").get();
  return snapshot.docs.map((doc) => {
    const raw = doc.data() as AppointmentDoc | LegacyAppointmentDoc;
    const { studentName, staff, date, time, status } = readAppointment(raw);
    return { id: doc.id, appointmentId: raw.appointmentId, studentName, staff, date, time, status };
  });
}

const isReferred = (item: CaseSummary) => item.referredTo !== "" && item.referredTo !== "Not Referred";

export async function getDashboard(userId: string) {
  const cases = await loadCases(userId);
  const today = todayString();
  const statusCount = (...statuses: string[]) =>
    cases.filter((item) => statuses.includes(getCaseStatus(item))).length;

  // Last 6 months, last 7 days and last 5 years (by intake date) for the Cases chart filter
  const sixMonthsAgo = new Date(`${today.slice(0, 7)}-01T00:00:00.000Z`);
  sixMonthsAgo.setUTCMonth(sixMonthsAgo.getUTCMonth() - 5);
  const monthStart = sixMonthsAgo.toISOString().slice(0, 10);
  const weekStart = todayString(-6);
  const firstYear = String(Number(today.slice(0, 4)) - 4);

  return {
    caseStats: {
      total: cases.length,
      forFollowUp: statusCount("today", "scheduled"),
      overdue: statusCount("overdue"),
      scheduled: statusCount("scheduled"), // follow-up date still ahead
      closed: statusCount("accomplished"),
      thisMonth: cases.filter((item) => item.intakeDate.startsWith(today.slice(0, 7))).length,
      referrals: cases.filter(isReferred).length,
    },
    casesPerMonth: countByMonth(cases.map((item) => item.intakeDate).filter((date) => date >= monthStart)),
    casesPerDay: countBy(
      cases.filter((item) => item.intakeDate >= weekStart && item.intakeDate <= today),
      (item) => item.intakeDate,
    ).map(({ label, count }) => ({ date: label, count })),
    casesPerYear: countBy(
      cases.filter((item) => item.intakeDate.slice(0, 4) >= firstYear),
      (item) => item.intakeDate.slice(0, 4),
    ).map(({ label, count }) => ({ year: label, count })),
    classifications: countBy(cases, (item) => item.classification, 3),
    concerns: countBy(cases, (item) => item.concern, 5),
    gradeSections: countBy(cases, (item) => item.gradeSection, 3),
    // Follow-ups from today onward that aren't accomplished, earliest first
    upcomingFollowUps: cases
      .filter((item) => item.followUpDate >= today && getCaseStatus(item) !== "accomplished")
      .sort((a, b) => a.followUpDate.localeCompare(b.followUpDate))
      .slice(0, 5)
      .map(({ id, caseNumber, learnerName, gradeSection, followUpDate, status }) => ({
        id,
        caseNumber,
        learnerName,
        gradeSection,
        followUpDate,
        status,
      })),
  };
}

export async function getSummary(userId: string) {
  const [cases, appointments] = await Promise.all([loadCases(userId), loadAppointments(userId)]);
  const completed = cases.filter((item) => getCaseStatus(item) === "accomplished").length;
  const appointmentCount = (status: string) => appointments.filter((item) => item.status === status).length;

  return {
    cases: { total: cases.length, completed, pending: cases.length - completed },
    appointmentStatus: {
      total: appointments.length,
      scheduled: appointmentCount("scheduled"),
      completed: appointmentCount("completed"),
      cancelled: appointmentCount("cancelled"),
      noShow: appointmentCount("no-show"),
    },
    appointmentsByMonth: countByMonth(appointments.map((item) => item.date)),
    referrals: countBy(cases.filter(isReferred), (item) => item.referredTo),
    workload: workloadByStaff(appointments),
  };
}

// Monthly or annual report. Cases count by intake date; "dueCases" are the cases whose
// follow-up date falls in the period (with their current status), earliest first.
export async function getPeriodReport(userId: string, { year, month }: PeriodQuery) {
  const [cases, appointments] = await Promise.all([loadCases(userId), loadAppointments(userId)]);
  const prefix = month ? `${year}-${String(month).padStart(2, "0")}` : String(year);
  const inPeriod = (date: string) => date.startsWith(prefix);

  const periodCases = cases.filter((item) => inPeriod(item.intakeDate));
  const periodAppointments = appointments.filter((item) => inPeriod(item.date));
  const statusCount = (status: string) => periodCases.filter((item) => getCaseStatus(item) === status).length;
  const accomplished = statusCount("accomplished");
  const appointmentCount = (status: string) => periodAppointments.filter((item) => item.status === status).length;

  return {
    period: { year, month: month ?? null },
    cases: {
      total: periodCases.length,
      accomplished,
      pending: periodCases.length - accomplished,
      overdue: statusCount("overdue"),
      referred: periodCases.filter(isReferred).length,
    },
    classifications: countBy(periodCases, (item) => item.classification),
    concerns: countBy(periodCases, (item) => item.concern),
    gradeSections: countBy(periodCases, (item) => item.gradeSection),
    referrals: countBy(periodCases.filter(isReferred), (item) => item.referredTo),
    appointments: {
      total: periodAppointments.length,
      scheduled: appointmentCount("scheduled"),
      completed: appointmentCount("completed"),
      cancelled: appointmentCount("cancelled"),
      noShow: appointmentCount("no-show"),
    },
    dueCases: cases
      .filter((item) => inPeriod(item.followUpDate))
      .sort((a, b) => a.followUpDate.localeCompare(b.followUpDate))
      .map(({ id, caseNumber, learnerName, gradeSection, concern, followUpDate, ...item }) => ({
        id,
        caseNumber,
        learnerName,
        gradeSection,
        concern,
        followUpDate,
        status: getCaseStatus({ ...item, followUpDate }),
      })),
  };
}

// Overdue and due-today follow-ups, scheduled appointments today or tomorrow,
// and system updates published by developers. `readIds`: notifications this user already read
// (ids like "overdue-<caseId>"), so the bell can hide them.
export async function getNotifications(userId: string) {
  const [cases, appointments, systemUpdates, readIds] = await Promise.all([
    loadCases(userId),
    loadAppointments(userId),
    updateService.getUpdateNotifications(userId),
    notificationService.getReadIds(userId),
  ]);
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
    systemUpdates,
    readIds,
  };
}
