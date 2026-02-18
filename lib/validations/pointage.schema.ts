import { z } from "zod";

export const checkInSchema = z.object({
  date: z.coerce
    .date({
      error: "Date invalide",
    })
    .default(() => new Date()),
  observations: z.string().optional().nullable(),
});

export const checkOutSchema = z.object({
  observations: z.string().optional().nullable(),
});

export const markAbsentSchema = z.object({
  userId: z.string().uuid("Identifiant utilisateur invalide"),
  date: z.coerce.date({
    error: "La date est requise",
  }),
  observations: z.string().optional().nullable(),
});

export type CheckInFormValues = z.infer<typeof checkInSchema>;
export type CheckOutFormValues = z.infer<typeof checkOutSchema>;
export type MarkAbsentFormValues = z.infer<typeof markAbsentSchema>;
