import { z } from "zod";

export const antenneSchema = z.object({
  nom: z.string().min(2, "Le nom est requis (2 caracteres min)"),
  code: z.string().min(2, "Le code est requis (2 caracteres min)"),
  region: z.string().min(2, "La region est requise (2 caracteres min)"),
  ville: z.string().min(2, "La ville est requise (2 caracteres min)"),
  adresse: z.string().optional().or(z.literal("")),
  telephone: z.string().optional().or(z.literal("")),
  email: z
    .string()
    .email("Email invalide")
    .optional()
    .or(z.literal("")),
});

export type AntenneFormValues = z.infer<typeof antenneSchema>;
