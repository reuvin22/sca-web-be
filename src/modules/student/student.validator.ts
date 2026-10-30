import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";
import { dateString, optionalFilter, optionalText, requiredText, searchDateQuerySchema } from "../../utils/schema";

// Optional "YYYY-MM-DD" kept as a string ("" when empty) because it is stored inside the encrypted details.
const optionalDateText = z.union([z.iso.date(), z.literal("")]).default("");
const shortText = optionalText(150);
const longText = optionalText(2000);

// Saved as plain columns because the Students page filters by them
const filterFields = {
  sex: optionalText(30),
  gradeSection: optionalText(100),
  schoolYear: optionalText(20),
  livesWith: optionalText(100),
  feelingAboutSchool: optionalText(100),
  prefersPrivate: optionalText(20),
  signatureReceived: optionalText(20),
  followUpNeeded: optionalText(20),
};

// Personal details: saved encrypted as one JSON value (see ENCRYPTED_DATA.md)
export const detailFields = {
  preferredName: shortText,
  age: optionalText(3).refine((value) => /^\d*$/.test(value), "Age must be a number"),
  birthday: optionalDateText,
  lrn: optionalText(20),
  address: optionalText(500),
  contactNumber: optionalText(30),
  guardian1Name: shortText,
  guardian1Relationship: shortText,
  guardian1Contact: optionalText(30),
  guardian2Name: shortText,
  guardian2Relationship: shortText,
  guardian2Contact: optionalText(30),
  otherLivingArrangement: shortText,
  emergencyPerson: shortText,
  emergencyRelationship: shortText,
  emergencyNumber: optionalText(30),
  subjectsEnjoyed: shortText,
  subjectsDifficult: shortText,
  hobbies: optionalText(500),
  talents: optionalText(500),
  helpsLearn: longText,
  schoolDifficult: longText,
  peopleToTalkTo: shortText,
  helpRequested: shortText,
  otherHelpRequested: shortText,
  career: shortText,
  wantsSchoolToKnow: longText,
  parentConcerns: longText,
  parentInputName: shortText,
  parentInputDate: optionalDateText,
  dateReviewed: optionalDateText,
  reviewedBy: shortText,
  recommendedActions: shortText,
  otherRecommendedAction: shortText,
  followUpDate: optionalDateText,
  guidanceRemarks: longText,
};

// Used for both create (POST) and full update (PUT)
export const studentSchema = z.object({
  dateEncoded: dateString,
  studentName: requiredText(150),
  ...filterFields,
  ...detailFields,
});

const filterValue = optionalFilter(150);

// ?search=&from=&to=&sex=&gradeSection=...&page=&limit=
export const studentQuerySchema = paginationQuerySchema.extend({
  ...searchDateQuerySchema.shape,
  sex: filterValue,
  gradeSection: filterValue,
  schoolYear: filterValue,
  livesWith: filterValue,
  feelingAboutSchool: filterValue,
  prefersPrivate: filterValue,
  signatureReceived: filterValue,
  followUpNeeded: filterValue,
});
