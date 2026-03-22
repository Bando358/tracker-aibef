import { z } from "zod";

export const projetSchema = z
  .object({
    code: z
      .string()
      .min(2, "Le code doit contenir au moins 2 caracteres")
      .max(30, "Le code ne peut depasser 30 caracteres"),
    nom: z
      .string()
      .min(3, "Le nom doit contenir au moins 3 caracteres"),
    description: z.string().optional(),
    dateDebut: z.coerce.date({ error: "La date de debut est requise" }),
    dateFin: z.coerce.date().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.dateFin && data.dateDebut) {
        return data.dateFin > data.dateDebut;
      }
      return true;
    },
    {
      message: "La date de fin doit etre posterieure a la date de debut",
      path: ["dateFin"],
    }
  );

export type ProjetFormValues = z.infer<typeof projetSchema>;
