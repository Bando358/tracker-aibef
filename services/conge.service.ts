import type { Role, StatutConge } from "@/app/generated/prisma/client";
import { eachDayOfInterval, isWeekend } from "date-fns";

/**
 * Calcule le nombre de jours ouvres entre deux dates (incluses).
 */
export function computeBusinessDays(start: Date, end: Date): number {
  if (end < start) return 0;
  const days = eachDayOfInterval({ start, end });
  return days.filter((day) => !isWeekend(day)).length;
}

/**
 * Determine si un approbateur peut approuver un conge
 * en fonction de son role et du statut actuel du conge.
 *
 * - RESPONSABLE_ANTENNE peut approuver un conge SOUMIS
 * - SUPER_ADMIN peut approuver un conge SOUMIS ou APPROUVE_RESPONSABLE
 */
export function canApprove(
  approverRole: Role,
  currentStatut: StatutConge
): boolean {
  if (approverRole === "RESPONSABLE_ANTENNE" && currentStatut === "SOUMIS") {
    return true;
  }
  if (
    approverRole === "SUPER_ADMIN" &&
    (currentStatut === "SOUMIS" || currentStatut === "APPROUVE_RESPONSABLE")
  ) {
    return true;
  }
  return false;
}

/**
 * Retourne le prochain statut d'approbation en fonction du role de l'approbateur.
 *
 * - RESPONSABLE_ANTENNE -> APPROUVE_RESPONSABLE
 * - SUPER_ADMIN -> APPROUVE_FINAL
 */
export function getNextApprovalStatus(approverRole: Role): StatutConge {
  if (approverRole === "RESPONSABLE_ANTENNE") {
    return "APPROUVE_RESPONSABLE" as StatutConge;
  }
  return "APPROUVE_FINAL" as StatutConge;
}
