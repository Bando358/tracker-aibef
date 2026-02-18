import { z } from "zod";

export const congeSchema = z
  .object({
    type: z.enum(
      [
        "ANNUEL",
        "MALADIE",
        "MATERNITE",
        "PATERNITE",
        "EXCEPTIONNEL",
        "SANS_SOLDE",
      ],
      { error: "Le type de conge est requis" }
    ),
    dateDebut: z.coerce.date({
      error: "La date de debut est requise",
    }),
    dateFin: z.coerce.date({
      error: "La date de fin est requise",
    }),
    motif: z
      .string()
      .min(5, "Le motif doit contenir au moins 5 caracteres"),
  })
  .refine((data) => data.dateFin >= data.dateDebut, {
    message: "La date de fin doit etre superieure ou egale a la date de debut",
    path: ["dateFin"],
  });

export type CongeFormValues = z.infer<typeof congeSchema>;
