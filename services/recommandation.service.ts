import type { StatutRecommandation } from "@/app/generated/prisma/client";

/**
 * Computes the effective status of a recommandation based on its deadline.
 * Returns EN_RETARD if the deadline has passed and the current status is
 * neither RESOLUE nor ANNULEE. Otherwise returns the current status unchanged.
 */
export function computeRecommandationStatus(
  dateEcheance: Date,
  currentStatut: StatutRecommandation
): StatutRecommandation {
  const terminalStatuses: StatutRecommandation[] = ["RESOLUE", "ANNULEE"];

  if (terminalStatuses.includes(currentStatut)) {
    return currentStatut;
  }

  const now = new Date();
  if (now > new Date(dateEcheance)) {
    return "EN_RETARD";
  }

  return currentStatut;
}

/**
 * Determines whether a recommandation should be automatically flagged as late.
 * Returns true only when the deadline has passed AND the recommandation is not
 * already in a terminal state (RESOLUE or ANNULEE) or already EN_RETARD.
 */
export function shouldAutoDetectLate(rec: {
  dateEcheance: Date;
  statut: StatutRecommandation;
}): boolean {
  const skipStatuses: StatutRecommandation[] = [
    "RESOLUE",
    "ANNULEE",
    "EN_RETARD",
  ];

  if (skipStatuses.includes(rec.statut)) {
    return false;
  }

  const now = new Date();
  return now > new Date(rec.dateEcheance);
}

/**
 * Builds a plain object suitable for creating a RecommandationHistorique record.
 * Does not interact with the database -- pure data transformation.
 */
export function buildHistoryEntry(
  oldStatut: StatutRecommandation,
  newStatut: StatutRecommandation,
  userId: string,
  comment?: string
): {
  ancienStatut: StatutRecommandation;
  nouveauStatut: StatutRecommandation;
  modifiePar: string;
  commentaire: string | null;
} {
  return {
    ancienStatut: oldStatut,
    nouveauStatut: newStatut,
    modifiePar: userId,
    commentaire: comment ?? null,
  };
}
