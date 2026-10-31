import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";
import { optionalFilter, optionalText, requiredText } from "../../utils/schema";

// Answer types: one per HTML form input (long text = textarea, dropdown = select), plus section headings
export const QUESTION_TYPES = [
  "section", // a heading bar that groups the questions below it (no answer)
  "text",
  "textarea",
  "number",
  "email",
  "tel",
  "url",
  "date",
  "time",
  "datetime-local",
  "month",
  "week",
  "select",
  "radio",
  "checkbox",
  "range",
  "color",
  "file",
] as const;

// Types where the form creator types the choices
export const OPTION_TYPES: readonly string[] = ["select", "radio", "checkbox"];

// `draft`: unfinished forms may have empty labels and choices (checked again when saved)
const questionSchema = (draft: boolean) =>
  z.object({
    id: z.string().trim().min(1).max(50),
    label: draft ? optionalText(500) : requiredText(500),
    type: z.enum(QUESTION_TYPES),
    required: z.boolean().default(false),
    options: z.array(draft ? optionalText(200) : requiredText(200)).max(50).default([]),
    // How radio buttons / checkboxes are shown: in a row that wraps (flex) or in columns (grid)
    layout: z.enum(["flex", "grid"]).default("flex"),
    columns: z.number().int().min(2).max(4).default(2),
    // Share of the row: fields with smaller widths sit side by side (like "Full name ... Date")
    width: z.enum(["full", "two-thirds", "half", "third"]).default("full"),
    // Short answer split into labeled blanks, e.g. First / Middle / Last
    parts: z.array(draft ? optionalText(100) : requiredText(100)).max(6).default([]),
    // Preset fields (Name, Section, Date...) so answers can be matched to students later
    variable: optionalText(50),
  });

const savedQuestion = questionSchema(false).refine(
  (question) => !OPTION_TYPES.includes(question.type) || question.options.length > 0,
  { message: "Add at least one option", path: ["options"] },
);

// Used for both create (POST) and full update (PUT)
export const formSchema = z.object({
  title: requiredText(150),
  description: optionalText(1000),
  // Student details at the top (Name, Date, Grade & Section...): printed as a grid, not numbered
  header: z.array(savedQuestion).max(30).default([]),
  // Numbered questions below the header
  questions: z.array(savedQuestion).max(100).default([]),
});

// Unfinished form kept when the user leaves the builder without saving (same limits, nothing required)
export const formDraftSchema = z.object({
  title: optionalText(150),
  description: optionalText(1000),
  header: z.array(questionSchema(true)).max(30).default([]),
  questions: z.array(questionSchema(true)).max(100).default([]),
});

// ?search=&page=&limit=
export const formQuerySchema = paginationQuerySchema.extend({
  search: optionalFilter(100),
});

// /public/forms/:code — the random code in a public answer link
export const linkCodeParamsSchema = z.object({ code: z.string().regex(/^[A-Za-z0-9_-]{20,64}$/, "Invalid link") });

// Answers sent from a public link: { answers: { [questionId]: text | list (checkboxes, split parts) } }
export const answersSchema = z.object({
  answers: z
    .record(z.string().max(50), z.union([z.string().max(5000), z.array(z.string().max(500)).max(50)]))
    .refine((answers) => Object.keys(answers).length <= 200, "Too many answers"),
});

// Counted when the owner downloads the form
export const exportSchema = z.object({ format: z.enum(["pdf", "word"]) });
