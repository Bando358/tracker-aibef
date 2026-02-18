import type { ChartDataPoint } from "@/types";
import { getMonthName } from "@/lib/date-utils";
import {
  STATUT_ACTIVITE_LABELS,
  STATUT_RECOMMANDATION_LABELS,
} from "@/lib/constants";

// ======================== TYPES ========================

export interface KPIInput {
  activitesTotal: number;
  activitesRealisees: number;
  activitesEnRetard: number;
  recommandationsTotal: number;
  recommandationsResolues: number;
  recommandationsEnRetard: number;
  employesTotal: number;
  congesEnAttente: number;
}

export interface KPIOutput {
  activitesTotal: number;
  activitesRealisees: number;
  activitesEnRetard: number;
  tauxRealisation: number;
  recommandationsTotal: number;
  recommandationsResolues: number;
  recommandationsEnRetard: number;
  tauxResolution: number;
  employesTotal: number;
  congesEnAttente: number;
}

// ======================== FUNCTIONS ========================

/**
 * Calcule les KPIs a partir des compteurs bruts.
 * Les taux sont exprimes en pourcentage (0-100), arrondis a 1 decimale.
 */
export function computeKPIs(data: KPIInput): KPIOutput {
  const tauxRealisation =
    data.activitesTotal > 0
      ? Math.round((data.activitesRealisees / data.activitesTotal) * 1000) / 10
      : 0;

  const tauxResolution =
    data.recommandationsTotal > 0
      ? Math.round(
          (data.recommandationsResolues / data.recommandationsTotal) * 1000
        ) / 10
      : 0;

  return {
    activitesTotal: data.activitesTotal,
    activitesRealisees: data.activitesRealisees,
    activitesEnRetard: data.activitesEnRetard,
    tauxRealisation,
    recommandationsTotal: data.recommandationsTotal,
    recommandationsResolues: data.recommandationsResolues,
    recommandationsEnRetard: data.recommandationsEnRetard,
    tauxResolution,
    employesTotal: data.employesTotal,
    congesEnAttente: data.congesEnAttente,
  };
}

/**
 * Regroupe des items par mois (base sur createdAt).
 * Retourne les 12 derniers mois en ordre chronologique.
 */
export function groupByMonth(
  items: { createdAt: Date }[]
): ChartDataPoint[] {
  const counts = new Map<string, number>();

  // Initialiser les 12 derniers mois
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    counts.set(key, 0);
  }

  // Compter les items
  for (const item of items) {
    const d = new Date(item.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (counts.has(key)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  // Convertir en ChartDataPoint avec noms de mois
  const result: ChartDataPoint[] = [];
  const entries = Array.from(counts.entries());
  for (let i = 0; i < entries.length; i++) {
    const [key, value] = entries[i];
    const month = parseInt(key.split("-")[1], 10);
    const name = getMonthName(month);
    // Capitaliser la premiere lettre
    result.push({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    });
  }

  return result;
}

/**
 * Regroupe des items par statut pour les graphiques en secteurs/barres.
 * Utilise les labels francais depuis les constantes.
 */
export function groupByStatus(
  items: { statut: string }[],
  labelMap?: Record<string, string>
): ChartDataPoint[] {
  const counts = new Map<string, number>();

  for (const item of items) {
    counts.set(item.statut, (counts.get(item.statut) ?? 0) + 1);
  }

  const labels = labelMap ?? {
    ...STATUT_ACTIVITE_LABELS,
    ...STATUT_RECOMMANDATION_LABELS,
  };

  return Array.from(counts.entries()).map(([statut, value]) => ({
    name: labels[statut] ?? statut.replace(/_/g, " "),
    value,
    statut,
  }));
}
