import { z } from "zod";

export const formationSchema = z
  .object({
    titre: z
      .string()
      .min(3, "Le titre doit contenir au moins 3 caracteres"),
    description: z.string().optional().nullable(),
    organisme: z.string().optional().nullable(),
    lieu: z.string().optional().nullable(),
    dateDebut: z.coerce.date({ error: "La date de debut est requise" }),
    dateFin: z.coerce.date({ error: "La date de fin est requise" }),
    cout: z
      .number()
      .positive("Le cout doit etre positif")
      .optional()
      .nullable(),
  })
  .refine(
    (data) => data.dateFin >= data.dateDebut,
    {
      message: "La date de fin doit etre posterieure ou egale a la date de debut",
      path: ["dateFin"],
    }
  );

export type FormationFormValues = z.infer<typeof formationSchema>;
