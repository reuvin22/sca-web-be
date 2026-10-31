/**
 * Dummy data for trying out the app: 100 cases, 100 appointments and 100 students for one account.
 * Records are created through the normal services, so they are encrypted like real data.
 * Each one is marked with "[Dummy data]" (case remarks, appointment notes, student guidance remarks)
 * so --clean deletes only these records.
 *
 * Usage:
 *   npm run db:seed -- you@example.com          (add the dummy data)
 *   npm run db:seed -- you@example.com --clean  (delete it again)
 */
import { todayString } from "../src/utils/date";
import { userCollection } from "../src/utils/firestore";
import { findUserByEmail } from "../src/modules/profile/profile.user";
import * as caseService from "../src/modules/case/case.service";
import * as appointmentService from "../src/modules/appointment/appointment.service";
import * as studentService from "../src/modules/student/student.service";
import { caseSchema } from "../src/modules/case/case.validator";
import { appointmentSchema } from "../src/modules/appointment/appointment.validator";
import { studentSchema } from "../src/modules/student/student.validator";

const MARK = "[Dummy data]";
const COUNT = 100;

const FIRST = ["Juan", "Maria", "Jose", "Ana", "Mark", "Angel", "John", "Princess", "Carlo", "Kyla", "Miguel", "Bea", "Paolo", "Jasmine", "Rafael", "Nicole", "Gabriel", "Andrea", "Joshua", "Patricia"];
const LAST = ["Dela Cruz", "Santos", "Reyes", "Garcia", "Mendoza", "Bautista", "Ramos", "Aquino", "Villanueva", "Castillo", "Flores", "Navarro", "Torres", "Domingo", "Lopez"];
const SECTIONS = ["Grade 7 - Sampaguita", "Grade 8 - Narra", "Grade 9 - Rizal", "Grade 10 - Mabini", "Grade 11 - STEM A", "Grade 12 - HUMSS B"];
const STAFF = ["Ms. Cruz", "Mr. Santos", "Ms. Reyes", "Mr. Garcia"];
const CONCERNS = ["Emotional / Mental Health", "Academic", "Behavioral", "Family", "Peer / Social"];
const ACTIONS = ["Psychological First Aid", "Individual Counseling", "Parent Conference", "Home Visitation"];
const REFERRALS = ["Referred to External Agency", "Referred to Class Adviser", "Referred to Principal", "Not Referred", "Not Referred"];
const CLASSIFICATIONS = ["Parent Request", "Walk-in", "Teacher Referral", "Follow-up"];
const APPOINTMENT_TYPES = ["Individual Counseling", "Group Counseling", "Parent Conference", "Follow-up Session", "Consultation"];
const REASONS = ["Academic", "Behavioral", "Emotional / Mental Health", "Family", "Peer / Social", "Career"];
const DURATIONS = ["15 minutes", "30 minutes", "45 minutes", "60 minutes"];
const TIMES = ["08:00", "09:00", "10:30", "13:00", "14:00", "15:30"];

// Fixed seed so every run makes the same mix
let state = 42;
const random = () => ((state = (state * 16807) % 2147483647) - 1) / 2147483646;
const pick = <T>(list: T[]) => list[Math.floor(random() * list.length)];
const between = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
const name = () => `${pick(FIRST)} ${pick(LAST)}`;

// Days ago spread so every chart filter has data: last 7 days, last 6 months, last 5 years
function daysAgo(i: number) {
  if (i < 15) return between(0, 6);
  if (i < 70) return between(7, 180);
  return between(181, 1800);
}

function makeCase(i: number) {
  const intake = -daysAgo(i);
  const followUp = intake + between(3, 30);
  const today = followUp === 0;
  // Older follow-ups are mostly done; recent ones are a mix of overdue, due today and scheduled
  const status = followUp < -30 ? (random() < 0.85 ? "accomplished" : "") : followUp < 0 && random() < 0.4 ? "accomplished" : "";
  return caseSchema.parse({
    intakeDate: todayString(intake),
    learnerName: name(),
    gradeSection: pick(SECTIONS),
    concern: pick(CONCERNS),
    action: pick(ACTIONS),
    referredTo: pick(REFERRALS),
    classification: pick(CLASSIFICATIONS),
    followUpDate: todayString(today ? 0 : followUp),
    status,
    remarks: MARK,
  });
}

function makeAppointment() {
  const offset = between(-120, 30);
  const status = offset > 0 ? "scheduled" : pick(["completed", "completed", "completed", "cancelled", "no-show"]);
  return appointmentSchema.parse({
    studentName: name(),
    staff: pick(STAFF),
    date: todayString(offset),
    time: pick(TIMES),
    duration: pick(DURATIONS),
    type: pick(APPOINTMENT_TYPES),
    reason: pick(REASONS),
    status,
    reminder: "1 day before",
    notes: MARK,
  });
}

function makeStudent() {
  const age = between(12, 18);
  return studentSchema.parse({
    dateEncoded: todayString(-between(0, 365)),
    studentName: name(),
    sex: pick(["Male", "Female"]),
    gradeSection: pick(SECTIONS),
    schoolYear: pick(["2025-2026", "2026-2027"]),
    livesWith: pick(["Both Parents", "Mother", "Father", "Guardian", "Relatives"]),
    feelingAboutSchool: pick(["Happy", "Okay", "Nervous", "Unhappy"]),
    prefersPrivate: pick(["Yes", "No"]),
    signatureReceived: pick(["Yes", "No"]),
    followUpNeeded: pick(["Yes", "No"]),
    age: String(age),
    birthday: `${new Date().getFullYear() - age}-${String(between(1, 12)).padStart(2, "0")}-${String(between(1, 28)).padStart(2, "0")}`,
    lrn: String(between(100000000000, 999999999999)),
    contactNumber: `09${between(100000000, 999999999)}`,
    guardian1Name: name(),
    guardian1Relationship: pick(["Mother", "Father", "Guardian"]),
    guardian1Contact: `09${between(100000000, 999999999)}`,
    subjectsEnjoyed: pick(["English", "Math", "Science", "MAPEH"]),
    subjectsDifficult: pick(["Filipino", "Math", "Science", "Araling Panlipunan"]),
    peopleToTalkTo: pick(["Parent", "Teacher", "Friend", "Guidance Counselor"]),
    helpRequested: pick(["Academic", "Emotional", "Social", "Family", "Career", "None"]),
    guidanceRemarks: MARK,
  });
}

// Runs tasks a few at a time so Firestore isn't flooded
async function inBatches<T>(items: T[], task: (item: T) => Promise<unknown>, size = 10) {
  for (let i = 0; i < items.length; i += size) await Promise.all(items.slice(i, i + size).map(task));
}

async function addDummyData(userId: string) {
  const range = Array.from({ length: COUNT }, (_, i) => i);
  await inBatches(range, (i) => caseService.createCase(userId, makeCase(i)));
  console.log(`Added ${COUNT} cases`);
  await inBatches(range, () => appointmentService.createAppointment(userId, makeAppointment()));
  console.log(`Added ${COUNT} appointments`);
  await inBatches(range, () => studentService.createStudent(userId, makeStudent()));
  console.log(`Added ${COUNT} students`);
}

// Deletes only records with the dummy mark (directly, so no "unusual deletions" alert is sent)
async function clean(userId: string) {
  const targets = [
    { name: "cases", isDummy: async (id: string) => (await caseService.getCase(userId, id)).remarks === MARK },
    { name: "appointments", isDummy: async (id: string) => (await appointmentService.getAppointment(userId, id)).notes === MARK },
    { name: "students", isDummy: async (id: string) => (await studentService.getStudent(userId, id)).guidanceRemarks === MARK },
  ];
  for (const { name: collection, isDummy } of targets) {
    const docs = (await userCollection(userId, collection).get()).docs;
    let deleted = 0;
    await inBatches(docs, async (doc) => {
      if (!(await isDummy(doc.id))) return;
      await doc.ref.delete();
      deleted++;
    });
    console.log(`Deleted ${deleted} dummy ${collection}`);
  }
}

async function main() {
  const email = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
  if (!email) throw new Error("Usage: npm run db:seed -- you@example.com [--clean]");
  const user = await findUserByEmail(email);
  if (!user) throw new Error(`No account found for ${email}`);

  if (process.argv.includes("--clean")) await clean(user.id);
  else await addDummyData(user.id);
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
