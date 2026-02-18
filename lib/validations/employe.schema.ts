import { z } from "zod";

export const employeSchema = z.object({
  nom: z.string().min(2, "Nom requis (2 caracteres min)"),
  prenom: z.string().min(2, "Prenom requis (2 caracteres min)"),
  email: z.string().email("Email invalide"),
  username: z.string().min(3, "Nom d'utilisateur requis (3 caracteres min)"),
  password: z.string().min(6, "Mot de passe requis (6 caracteres min)"),
  role: z.enum([
    "SUPER_ADMIN",
    "RESPONSABLE_ANTENNE",
    "ADMINISTRATIF",
    "SOIGNANT",
  ]),
  antenneId: z.string().uuid("Antenne invalide").optional().nullable(),
  typeJournee: z.enum(["FIXE", "VARIABLE"]).default("FIXE"),
  telephone: z.string().optional().nullable(),
});

export const employeUpdateSchema = z.object({
  nom: z.string().min(2, "Nom requis (2 caracteres min)"),
  prenom: z.string().min(2, "Prenom requis (2 caracteres min)"),
  email: z.string().email("Email invalide"),
  username: z.string().min(3, "Nom d'utilisateur requis (3 caracteres min)"),
  password: z
    .string()
    .min(6, "Mot de passe requis (6 caracteres min)")
    .optional()
    .or(z.literal("")),
  role: z.enum([
    "SUPER_ADMIN",
    "RESPONSABLE_ANTENNE",
    "ADMINISTRATIF",
    "SOIGNANT",
  ]),
  antenneId: z.string().uuid("Antenne invalide").optional().nullable(),
  typeJournee: z.enum(["FIXE", "VARIABLE"]).default("FIXE"),
  telephone: z.string().optional().nullable(),
});

export type EmployeFormValues = z.infer<typeof employeSchema>;
export type EmployeUpdateFormValues = z.infer<typeof employeUpdateSchema>;
