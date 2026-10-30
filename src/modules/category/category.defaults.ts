// Categories every new account starts with. Names must match the frontend form labels
// so those fields show as dropdowns.
export const DEFAULT_CATEGORIES: { name: string; options: string[] }[] = [
  { name: "Sex", options: ["Male", "Female", "Not provided"] },
  { name: "Grade & Section", options: [] },
  {
    name: "Nature of Concern",
    options: ["Emotional / Mental Health", "Academic", "Behavioral", "Family", "Peer / Social"],
  },
  {
    name: "Action / Service Rendered",
    options: ["Psychological First Aid", "Individual Counseling", "Parent Conference", "Home Visitation"],
  },
  {
    name: "Referred To / Remarks",
    options: ["Referred to External Agency", "Referred to Class Adviser", "Referred to Principal", "Not Referred"],
  },
  { name: "Intake Classification", options: ["Parent Request", "Walk-in", "Teacher Referral", "Follow-up"] },
  // Students
  { name: "School Year", options: ["2025-2026", "2026-2027"] },
  { name: "Relationship", options: ["Mother", "Father", "Guardian", "Grandparent", "Sibling", "Other"] },
  { name: "Who Student Lives With", options: ["Both Parents", "Mother", "Father", "Guardian", "Relatives", "Other"] },
  { name: "Subjects", options: ["English", "Filipino", "Math", "Science", "Araling Panlipunan", "MAPEH", "ESP", "TLE"] },
  { name: "Feeling About Going to School", options: ["Happy", "Okay", "Nervous", "Unhappy"] },
  {
    name: "People Student Can Talk To",
    options: ["Parent", "Teacher", "Friend", "Sibling", "Guidance Counselor", "No one"],
  },
  { name: "Help Requested", options: ["Academic", "Emotional", "Social", "Family", "Career", "None"] },
  { name: "Prefers to Discuss Privately", options: ["Yes", "No"] },
  { name: "Parent/Guardian Signature Received", options: ["Yes", "No"] },
  { name: "Reviewed By", options: ["Guidance Counselor", "Guidance Associate"] },
  { name: "Follow-up Needed", options: ["Yes", "No"] },
  {
    name: "Recommended Actions",
    options: ["Individual Counseling", "Parent Conference", "Referral", "Monitoring", "None"],
  },
  // Appointments
  { name: "Assigned Staff", options: [] },
  { name: "Duration", options: ["15 minutes", "30 minutes", "45 minutes", "60 minutes", "90 minutes"] },
  {
    name: "Appointment Type",
    options: ["Individual Counseling", "Group Counseling", "Parent Conference", "Follow-up Session", "Consultation"],
  },
  {
    name: "Reason / Category",
    options: ["Academic", "Behavioral", "Emotional / Mental Health", "Family", "Peer / Social", "Career"],
  },
];
