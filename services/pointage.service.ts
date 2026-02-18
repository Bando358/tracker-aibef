import type { StatutPointage } from "@/app/generated/prisma/client";
import { parseTimeString } from "@/lib/date-utils";

/**
 * Determine le statut du pointage en comparant l'heure d'arrivee
 * avec l'heure de debut attendue + seuil de tolerance.
 */
export function computePointageStatus(
  heureArrivee: Date,
  heureDebutFixe: string,
  thresholdMinutes: number
): { statut: StatutPointage; retardMinutes: number } {
  const { hours, minutes } = parseTimeString(heureDebutFixe);

  const expected = new Date(heureArrivee);
  expected.setHours(hours, minutes, 0, 0);

  const deadlineMs = expected.getTime() + thresholdMinutes * 60 * 1000;
  const arrivalMs = heureArrivee.getTime();

  if (arrivalMs <= deadlineMs) {
    return { statut: "PRESENT" as StatutPointage, retardMinutes: 0 };
  }

  const retardMinutes = Math.ceil((arrivalMs - expected.getTime()) / (60 * 1000));
  return { statut: "RETARD" as StatutPointage, retardMinutes };
}

/**
 * Calcule les heures supplementaires en comparant l'heure de depart
 * avec l'heure de fin prevue. Retourne 0 si depart anticipe.
 */
export function computeOvertime(
  heureDepart: Date,
  heureFinFixe: string
): number {
  const { hours, minutes } = parseTimeString(heureFinFixe);

  const expectedEnd = new Date(heureDepart);
  expectedEnd.setHours(hours, minutes, 0, 0);

  const diffMs = heureDepart.getTime() - expectedEnd.getTime();

  if (diffMs <= 0) return 0;

  const overtimeHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
  return overtimeHours;
}

/**
 * Agrege les statistiques mensuelles de pointage.
 */
export function computeMonthSummary(
  pointages: Array<{
    statut: string;
    retardMinutes: number;
    heuresSupp: number;
  }>
): {
  presents: number;
  absents: number;
  retards: number;
  totalRetardMinutes: number;
  totalHeuresSupp: number;
} {
  let presents = 0;
  let absents = 0;
  let retards = 0;
  let totalRetardMinutes = 0;
  let totalHeuresSupp = 0;

  for (const p of pointages) {
    switch (p.statut) {
      case "PRESENT":
        presents++;
        break;
      case "ABSENT":
        absents++;
        break;
      case "RETARD":
        retards++;
        totalRetardMinutes += p.retardMinutes;
        break;
      case "CONGE":
        break;
    }
    totalHeuresSupp += p.heuresSupp;
  }

  return {
    presents,
    absents,
    retards,
    totalRetardMinutes,
    totalHeuresSupp: parseFloat(totalHeuresSupp.toFixed(2)),
  };
}
