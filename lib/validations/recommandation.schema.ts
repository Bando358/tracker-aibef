import { z } from "zod";

export const recommandationSchema = z
  .object({
    titre: z
      .string()
      .min(3, "Le titre doit contenir au moins 3 caracteres"),
    description: z
      .string()
      .min(10, "La description doit contenir au moins 10 caracteres"),
    source: z.enum(["ACTIVITE", "REUNION", "SUPERVISION", "FORMATION"], {
      error: "La source est requise",
    }),
    typeResolution: z.enum(["PERMANENTE", "PONCTUELLE", "PERIODIQUE"], {
      error: "Le type de resolution est requis",
    }),
    priorite: z.enum(["HAUTE", "MOYENNE", "BASSE"], {
      error: "La priorite est requise",
    }),
    dateEcheance: z.coerce.date({
      error: "La date d'echeance est requise",
    }),
    frequence: z
      .enum(["MENSUELLE", "TRIMESTRIELLE", "ANNUELLE"])
      .optional()
      .nullable(),
    activiteId: z
      .string()
      .uuid("Identifiant d'activite invalide")
      .optional()
      .nullable(),
    antenneId: z
      .string()
      .uuid("Identifiant d'antenne invalide")
      .optional()
      .nullable(),
    responsableIds: z
      .array(z.string().uuid("Identifiant de responsable invalide"))
      .min(1, "Au moins un responsable est requis"),
    observations: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.typeResolution === "PERIODIQUE" && !data.frequence) {
        return false;
      }
      return true;
    },
    {
      message: "La frequence est requise pour une resolution periodique",
      path: ["frequence"],
    }
  );

export type RecommandationFormValues = z.infer<typeof recommandationSchema>;
