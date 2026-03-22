import { z } from "zod";

export const evaluationSchema = z.object({
  periode: z
    .string()
    .min(1, "La periode est requise (ex: 2026-S1)"),
  dateEval: z.coerce.date({
    error: "La date d'evaluation est requise",
  }),
  employeId: z
    .string()
    .uuid("Identifiant d'employe invalide"),
  noteGlobale: z
    .number()
    .min(0, "La note doit etre entre 0 et 20")
    .max(20, "La note doit etre entre 0 et 20")
    .optional()
    .nullable(),
  commentaire: z.string().optional().nullable(),
  objectifs: z.string().optional().nullable(),
  pointsForts: z.string().optional().nullable(),
  axesProgres: z.string().optional().nullable(),
});

export type EvaluationFormValues = z.infer<typeof evaluationSchema>;
