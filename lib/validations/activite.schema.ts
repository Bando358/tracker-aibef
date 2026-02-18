import { z } from "zod";

export const antenneAssignmentSchema = z.object({
  antenneId: z.string().uuid("Identifiant d'antenne invalide"),
  responsableId: z.string().uuid("Identifiant de responsable invalide"),
});

export const activiteSchema = z
  .object({
    titre: z
      .string()
      .min(3, "Le titre doit contenir au moins 3 caracteres"),
    description: z.string().optional(),
    type: z.enum(["PONCTUELLE", "PERIODIQUE"], {
      error: "Le type d'activite est requis",
    }),
    frequence: z
      .enum(["MENSUELLE", "TRIMESTRIELLE", "ANNUELLE"])
      .optional()
      .nullable(),
    periodicite: z
      .enum(["LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "AVANT_JOUR_DU_MOIS"])
      .optional()
      .nullable(),
    jourPeriodicite: z
      .number()
      .int()
      .min(1, "Le jour doit etre entre 1 et 31")
      .max(31, "Le jour doit etre entre 1 et 31")
      .optional()
      .nullable(),
    dateDebut: z.coerce.date().optional().nullable(),
    dateFin: z.coerce.date().optional().nullable(),
    budget: z
      .number()
      .positive("Le budget doit etre positif")
      .optional()
      .nullable(),
    projetId: z.string().uuid("Identifiant de projet invalide").optional().nullable(),
    antenneAssignments: z
      .array(antenneAssignmentSchema)
      .min(1, "Au moins une affectation d'antenne est requise"),
  })
  // Dates requises uniquement pour les activites ponctuelles
  .refine(
    (data) => {
      if (data.type === "PONCTUELLE" && !data.dateDebut) return false;
      return true;
    },
    { message: "La date de debut est requise", path: ["dateDebut"] }
  )
  .refine(
    (data) => {
      if (data.type === "PONCTUELLE" && !data.dateFin) return false;
      return true;
    },
    { message: "La date de fin est requise", path: ["dateFin"] }
  )
  .refine(
    (data) => {
      if (data.type === "PONCTUELLE" && data.dateDebut && data.dateFin) {
        return data.dateFin > data.dateDebut;
      }
      return true;
    },
    {
      message: "La date de fin doit etre posterieure a la date de debut",
      path: ["dateFin"],
    }
  )
  .refine(
    (data) => {
      if (data.type === "PERIODIQUE" && !data.frequence) return false;
      return true;
    },
    {
      message: "La frequence est requise pour une activite periodique",
      path: ["frequence"],
    }
  )
  .refine(
    (data) => {
      if (data.type === "PERIODIQUE" && !data.periodicite) return false;
      return true;
    },
    {
      message: "La periodicite est requise pour une activite periodique",
      path: ["periodicite"],
    }
  )
  .refine(
    (data) => {
      if (data.periodicite === "AVANT_JOUR_DU_MOIS" && !data.jourPeriodicite) return false;
      return true;
    },
    {
      message: "Le jour du mois est requis",
      path: ["jourPeriodicite"],
    }
  );

export type ActiviteFormValues = z.infer<typeof activiteSchema>;
export type AntenneAssignment = z.infer<typeof antenneAssignmentSchema>;
