import type { z } from "zod";
import type { appointmentQuerySchema, appointmentSchema } from "./appointment.validator";

export type AppointmentInput = z.infer<typeof appointmentSchema>;
export type AppointmentQuery = z.infer<typeof appointmentQuerySchema>;

// Firestore: users/{userId}/appointments/{id}
export interface AppointmentDoc {
  appointmentId: string;
  data: string; // AES-256-GCM encrypted JSON: the whole appointment (AppointmentInput)
  createdAt: string;
  updatedAt: string;
}

// Saved before full encryption: plain fields with only the notes encrypted
export type LegacyAppointmentDoc = Omit<AppointmentInput, "notes"> & {
  appointmentId: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};
