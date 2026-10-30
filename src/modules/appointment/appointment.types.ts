import type { z } from "zod";
import type { appointmentQuerySchema, appointmentSchema } from "./appointment.validator";

export type AppointmentInput = z.infer<typeof appointmentSchema>;
export type AppointmentQuery = z.infer<typeof appointmentQuerySchema>;

// Firestore: users/{userId}/appointments/{id}
export type AppointmentDoc = Omit<AppointmentInput, "notes"> & {
  appointmentId: string;
  dateTime: string; // "YYYY-MM-DD HH:MM", used to sort by date then time
  notes: string | null; // AES-256-GCM encrypted
  createdAt: string;
  updatedAt: string;
};
