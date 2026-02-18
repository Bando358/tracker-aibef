import type { StatutActivite } from "@/app/generated/prisma/client";

/**
 * Determine si une activite devrait passer au statut EN_RETARD.
 * Une activite est en retard si sa date de fin est depassee
 * et qu'elle n'est ni REALISEE ni ANNULEE.
 */
export function computeActiviteStatus(
  dateFin: Date | null,
  currentStatut: StatutActivite
): StatutActivite {
  if (!dateFin) return currentStatut;
  const now = new Date();
  const isOverdue = now > new Date(dateFin);
  const isTerminal =
    currentStatut === "REALISEE" || currentStatut === "ANNULEE";

  if (isOverdue && !isTerminal) {
    return "EN_RETARD";
  }

  return currentStatut;
}

/**
 * Verifie si une activite devrait etre automatiquement detectee comme en retard.
 * Retourne true si la date de fin est depassee et le statut actuel n'est pas terminal.
 */
export function shouldAutoDetectLate(activite: {
  dateFin: Date | null;
  statut: StatutActivite;
}): boolean {
  if (!activite.dateFin) return false;
  const now = new Date();
  const isOverdue = now > new Date(activite.dateFin);
  const isTerminal =
    activite.statut === "REALISEE" || activite.statut === "ANNULEE";
  const isAlreadyLate = activite.statut === "EN_RETARD";

  return isOverdue && !isTerminal && !isAlreadyLate;
}

/**
 * Construit une entree d'historique pour un changement de statut d'activite.
 */
export function buildHistoryEntry(
  oldStatut: StatutActivite,
  newStatut: StatutActivite,
  userId: string,
  comment?: string
): {
  ancienStatut: StatutActivite;
  nouveauStatut: StatutActivite;
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
