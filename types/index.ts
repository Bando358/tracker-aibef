// Re-export types for client components (avoid importing from @/app/generated/prisma in "use client" files)
export type RoleType = "SUPER_ADMIN" | "RESPONSABLE_ANTENNE" | "ADMINISTRATIF" | "SOIGNANT";
export type StatutActiviteType = "PLANIFIEE" | "EN_COURS" | "REALISEE" | "EN_RETARD" | "ANNULEE" | "REPROGRAMMEE";
export type TypeActiviteType = "PONCTUELLE" | "PERIODIQUE";
export type FrequenceType = "MENSUELLE" | "TRIMESTRIELLE" | "ANNUELLE";
export type PeriodiciteType = "LUNDI" | "MARDI" | "MERCREDI" | "JEUDI" | "VENDREDI" | "AVANT_JOUR_DU_MOIS";
export type StatutRecommandationType = "EN_ATTENTE" | "EN_COURS" | "PARTIELLEMENT_REALISEE" | "RESOLUE" | "EN_RETARD" | "ANNULEE";
export type SourceRecommandationType = "ACTIVITE" | "REUNION" | "SUPERVISION" | "FORMATION";
export type TypeResolutionType = "PERMANENTE" | "PONCTUELLE" | "PERIODIQUE";
export type PrioriteType = "HAUTE" | "MOYENNE" | "BASSE";
export type StatutPointageType = "PRESENT" | "ABSENT" | "RETARD" | "CONGE";
export type TypeCongeType = "ANNUEL" | "MALADIE" | "MATERNITE" | "PATERNITE" | "EXCEPTIONNEL" | "SANS_SOLDE";
export type StatutCongeType = "BROUILLON" | "SOUMIS" | "APPROUVE_RESPONSABLE" | "APPROUVE_FINAL" | "REFUSE" | "ANNULE";
export type TypeJourneeType = "FIXE" | "VARIABLE";

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SearchParams {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface SessionUser {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  username: string;
  role: RoleType;
  antenneId: string | null;
  antenneName: string | null;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}
