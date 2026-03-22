export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN_SIMPLE: "ADMIN_SIMPLE",
  RESPONSABLE_ANTENNE: "RESPONSABLE_ANTENNE",
  ADMIN_ANTENNE: "ADMIN_ANTENNE",
  PERSONNEL: "PERSONNEL",
  VOLONTAIRE: "VOLONTAIRE",
  MAJ: "MAJ",
} as const;

// Roles qui ne font pas de pointage
export const ROLES_SANS_POINTAGE: string[] = ["VOLONTAIRE", "MAJ"];

export const FIXED_HOURS = {
  start: "07:30",
  end: "16:30",
  pauseDebut: "12:30",
  pauseFin: "13:30",
};
export const LATE_THRESHOLD_MINUTES = 15;
export const PAGINATION_DEFAULT = 20;

export const STATUT_ACTIVITE_LABELS: Record<string, string> = {
  NON_PLANIFIEE: "Non planifiee",
  PLANIFIEE: "Planifiee",
  EN_COURS: "En cours",
  REALISEE: "Realisee",
  EN_RETARD: "En retard",
  ANNULEE: "Annulee",
  SUSPENDUE: "Suspendue",
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
  ADMIN_SIMPLE: "Administrateur",
  RESPONSABLE_ANTENNE: "Responsable d'antenne",
  ADMIN_ANTENNE: "Admin antenne",
  PERSONNEL: "Personnel",
  VOLONTAIRE: "Volontaire",
  MAJ: "MAJ (Mouvement Action Jeune)",
};

export const TYPE_CONGE_LABELS: Record<string, string> = {
  ANNUEL: "Conge annuel",
  MALADIE: "Conge maladie",
  MATERNITE: "Conge maternite",
  PATERNITE: "Conge paternite",
  EXCEPTIONNEL: "Conge exceptionnel",
  SANS_SOLDE: "Conge sans solde",
};

export const STATUT_POINTAGE_LABELS: Record<string, string> = {
  PRESENT: "Present",
  RETARD: "Retard",
  ABSENT: "Absent",
  CONGE: "Conge",
  MISSION: "Mission",
  ARRET_MALADIE: "Arret maladie",
  ABSENCE_AUTORISEE: "Absence autorisee",
  ABSENCE_NON_AUTORISEE: "Absence non autorisee",
  FERIE: "Ferie",
};

export const SOURCE_RECOMMANDATION_LABELS: Record<string, string> = {
  ACTIVITE: "Activite",
  REUNION: "Reunion",
  SUPERVISION: "Supervision",
  FORMATION: "Formation",
};

export const STATUT_MISSION_LABELS: Record<string, string> = {
  PLANIFIEE: "Planifiee",
  EN_COURS: "En cours",
  TERMINEE: "Terminee",
  ANNULEE: "Annulee",
};

// ======================== PERMISSIONS ========================

export const PERMISSIONS = {
  DASHBOARD: "dashboard",
  PROJETS: "projets",
  ACTIVITES: "activites",
  RECOMMANDATIONS: "recommandations",
  CHRONOGRAMME: "chronogramme",
  MISSIONS: "missions",
  RAPPORTS: "rapports",
  POINTAGES: "pointages",
  CONGES: "conges",
  EMPLOYES: "employes",
  ANTENNES: "antennes",
  FORMATIONS: "formations",
  EVALUATIONS: "evaluations",
  EMPREINTES: "empreintes",
  AUDIT_LOG: "audit-log",
} as const;

export const PERMISSION_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  projets: "Projets",
  activites: "Activites",
  recommandations: "Recommandations",
  chronogramme: "Chronogramme",
  missions: "Missions",
  rapports: "Rapports",
  pointages: "Pointages",
  conges: "Conges",
  employes: "Employes",
  antennes: "Antennes",
  formations: "Formations",
  evaluations: "Evaluations",
  empreintes: "Empreintes digitales",
  "audit-log": "Journal d'audit",
};

// Permissions par defaut selon le role (ce qu'on a sans UserPermission)
export const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: Object.values(PERMISSIONS),
  ADMIN_SIMPLE: Object.values(PERMISSIONS).filter((p) => p !== "audit-log"),
  RESPONSABLE_ANTENNE: ["dashboard", "projets", "activites", "recommandations", "chronogramme", "missions", "rapports", "pointages", "conges", "antennes", "employes", "formations", "evaluations", "empreintes"],
  ADMIN_ANTENNE: ["dashboard", "projets", "activites", "recommandations", "chronogramme", "missions", "rapports", "pointages", "conges", "antennes", "employes", "formations", "evaluations", "empreintes"],
  PERSONNEL: ["dashboard", "pointages", "conges", "missions"],
  VOLONTAIRE: ["dashboard", "projets", "activites"],
  MAJ: ["dashboard", "projets", "activites"],
};

export const PRIORITE_LABELS: Record<string, string> = {
  HAUTE: "Haute",
  MOYENNE: "Moyenne",
  BASSE: "Basse",
};
