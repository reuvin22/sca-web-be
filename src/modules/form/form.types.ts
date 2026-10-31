import type { z } from "zod";
import type { formQuerySchema, formSchema } from "./form.validator";

export type FormInput = z.infer<typeof formSchema>;
export type FormQuery = z.infer<typeof formQuerySchema>;

// Firestore: users/{userId}/forms/{id}
export interface FormDoc {
  data: string; // AES-256-GCM encrypted JSON (FormInput: title, description, header, questions)
  link?: string | null; // AES-256-GCM encrypted code of the public answer link (null when turned off)
  exports?: { pdf?: number; word?: number }; // how many times the form was exported
  createdAt: string;
  updatedAt: string;
}

// Firestore: formLinks/{sha256 of the link code} → which form a public link opens
export interface FormLinkDoc {
  userId: string;
  formId: string;
  createdAt: string;
}

// One answer in a response, with the question as it was when answered
export interface AnswerEntry {
  id: string;
  label: string;
  value: string | string[];
}

// Firestore: users/{userId}/forms/{formId}/responses/{id}
export interface FormResponseDoc {
  data: string; // AES-256-GCM encrypted JSON: AnswerEntry[]
  submittedAt: string;
}
