export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  RESPONSABLE_ANTENNE: "RESPONSABLE_ANTENNE",
  ADMINISTRATIF: "ADMINISTRATIF",
  SOIGNANT: "SOIGNANT",
} as const;

export const FIXED_HOURS = { start: "08:00", end: "16:00" };
export const LATE_THRESHOLD_MINUTES = 15;
export const PAGINATION_DEFAULT = 20;

export const STATUT_ACTIVITE_LABELS: Record<string, string> = {
  PLANIFIEE: "Planifiee",
  EN_COURS: "En cours",
  REALISEE: "Realisee",
  EN_RETARD: "En retard",
  ANNULEE: "Annulee",
  REPROGRAMMEE: "Reprogrammee",
};

export const STATUT_RECOMMANDATION_LABELS: Record<string, string> = {
  EN_ATTENTE: "En attente",
  EN_COURS: "En cours",
  PARTIELLEMENT_REALISEE: "Partiellement realisee",
  RESOLUE: "Resolue",
  EN_RETARD: "En retard",
  ANNULEE: "Annulee",
};

export const STATUT_CONGE_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon",
  SOUMIS: "Soumis",
  APPROUVE_RESPONSABLE: "Approuve (Responsable)",
  APPROUVE_FINAL: "Approuve (Final)",
  REFUSE: "Refuse",
  ANNULE: "Annule",
};

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Administrateur",
  RESPONSABLE_ANTENNE: "Responsable d'antenne",
  ADMINISTRATIF: "Administratif",
  SOIGNANT: "Soignant",
};

export const TYPE_CONGE_LABELS: Record<string, string> = {
  ANNUEL: "Conge annuel",
  MALADIE: "Conge maladie",
  MATERNITE: "Conge maternite",
  PATERNITE: "Conge paternite",
  EXCEPTIONNEL: "Conge exceptionnel",
  SANS_SOLDE: "Conge sans solde",
};

export const PRIORITE_LABELS: Record<string, string> = {
  HAUTE: "Haute",
  MOYENNE: "Moyenne",
  BASSE: "Basse",
};
