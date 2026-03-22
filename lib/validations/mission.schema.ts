import { z } from "zod";

export const missionSchema = z
  .object({
    objet: z
      .string()
      .min(3, "L'objet doit contenir au moins 3 caracteres"),
    lieu: z
      .string()
      .min(2, "Le lieu doit contenir au moins 2 caracteres"),
    dateDebut: z.coerce.date({
      error: "La date de debut est requise",
    }),
    dateFin: z.coerce.date({
      error: "La date de fin est requise",
    }),
    perDiem: z
      .number()
      .positive("Le per diem doit etre positif")
      .optional()
      .nullable(),
    responsableId: z
      .string()
      .uuid("Identifiant de responsable invalide"),
    observations: z.string().optional().nullable(),
  })
  .refine((data) => data.dateFin >= data.dateDebut, {
    message: "La date de fin doit etre superieure ou egale a la date de debut",
    path: ["dateFin"],
  });

export type MissionFormValues = z.infer<typeof missionSchema>;
