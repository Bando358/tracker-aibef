"use server";

import prisma from "@/lib/prisma";
import {
  computeKPIs,
  groupByMonth,
  groupByStatus,
  type KPIOutput,
} from "@/services/dashboard.service";
import {
  STATUT_ACTIVITE_LABELS,
  STATUT_RECOMMANDATION_LABELS,
} from "@/lib/constants";
import type { ChartDataPoint } from "@/types";

// ======================== TYPES ========================

export interface DashboardData {
  kpis: KPIOutput;
  activitesByStatus: ChartDataPoint[];
  recommandationsByStatus: ChartDataPoint[];
  activitesByMonth: ChartDataPoint[];
  performanceByAntenne: ChartDataPoint[];
  recentActivites: RecentActivite[];
  recentRecommandations: RecentRecommandation[];
  pointageSummary: PointageSummary | null;
  congesData: CongesData;
  retardsData: RetardsData;
}

export interface RecentActivite {
  id: string;
  titre: string;
  statut: string;
  dateDebut: string | null;
  dateFin: string | null;
  projetNom: string | null;
}

export interface RecentRecommandation {
  id: string;
  titre: string;
  statut: string;
  priorite: string;
  dateEcheance: string;
  antenneNom: string | null;
}

export interface PointageSummary {
  present: number;
  absent: number;
  retard: number;
  conge: number;
}

export interface CongeItem {
  id: string;
  employeNom: string;
  employePrenom: string;
  type: string;
  statut: string;
  dateDebut: string;
  dateFin: string;
  nbJours: number;
  antenneNom: string | null;
}

export interface CongesData {
  enAttente: number;
  approuves: number;
  refuses: number;
  totalJoursUtilises: number;
  recentConges: CongeItem[];
  congesByType: ChartDataPoint[];
}

export interface RetardItem {
  id: string;
  employeNom: string;
  employePrenom: string;
  date: string;
  retardMinutes: number;
  antenneNom: string | null;
}

export interface RetardsData {
  totalRetardsMois: number;
  totalAbsencesMois: number;
  totalRetardMinutes: number;
  employesAvecRetard: number;
  recentRetards: RetardItem[];
  retardsByDay: ChartDataPoint[];
}

// Inline shapes for Prisma query results to avoid implicit any
interface StatusCreatedAt {
  statut: string;
  createdAt: Date;
}

interface ActiviteRow {
  id: string;
  titre: string;
  statut: string;
  dateDebut: Date;
  dateFin: Date;
  projet: { nom: string } | null;
}

interface RecommandationRow {
  id: string;
  titre: string;
  statut: string;
  priorite: string;
  dateEcheance: Date;
  antenne: { nom: string } | null;
}

interface AntenneCount {
  nom: string;
  _count: { activiteAntennes: number };
}

interface ActiviteAntenneWithActivite {
  statut: string;
  activite: {
    id: string;
    titre: string;
    dateDebut: Date;
    dateFin: Date;
    projet: { nom: string } | null;
  };
}

interface RecoResponsableWithReco {
  recommandation: {
    id: string;
    titre: string;
    statut: string;
    priorite: string;
    dateEcheance: Date;
    antenne: { nom: string } | null;
  };
}

interface RecoResponsableStatus {
  recommandation: {
    statut: string;
    createdAt: Date;
  };
}

interface PointageStatus {
  statut: string;
}

// ======================== HELPERS ========================

function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function getWeekRange() {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1);
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  return { startOfWeek, endOfWeek };
}

const JOUR_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

// ======================== CONGES DATA ========================

async function fetchCongesData(
  whereEmploye: Record<string, unknown> | undefined
): Promise<CongesData> {
  const currentYear = new Date().getFullYear();
  const yearStart = new Date(currentYear, 0, 1);
  const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999);

  const employeFilter = whereEmploye ? { employe: whereEmploye } : {};

  const [enAttente, approuves, refuses, approuvedConges, recentCongesRaw] =
    await Promise.all([
      prisma.conge.count({
        where: {
          statut: { in: ["SOUMIS", "APPROUVE_RESPONSABLE"] },
          ...employeFilter,
        },
      }),
      prisma.conge.count({
        where: {
          statut: "APPROUVE_FINAL",
          dateDebut: { gte: yearStart, lte: yearEnd },
          ...employeFilter,
        },
      }),
      prisma.conge.count({
        where: {
          statut: "REFUSE",
          dateDebut: { gte: yearStart, lte: yearEnd },
          ...employeFilter,
        },
      }),
      prisma.conge.findMany({
        where: {
          statut: "APPROUVE_FINAL",
          dateDebut: { gte: yearStart, lte: yearEnd },
          ...employeFilter,
        },
        select: { nbJours: true, type: true },
      }),
      prisma.conge.findMany({
        where: employeFilter,
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          statut: true,
          dateDebut: true,
          dateFin: true,
          nbJours: true,
          employe: {
            select: { nom: true, prenom: true, antenne: { select: { nom: true } } },
          },
        },
      }),
    ]);

  const totalJoursUtilises = approuvedConges.reduce(
    (sum: number, c: { nbJours: number }) => sum + c.nbJours,
    0
  );

  // Group by type for chart
  const typeMap: Record<string, number> = {};
  for (const c of approuvedConges) {
    const t = c.type as string;
    typeMap[t] = (typeMap[t] || 0) + 1;
  }
  const congesByType: ChartDataPoint[] = Object.entries(typeMap).map(
    ([type, count]) => ({ name: type, value: count })
  );

  const recentConges: CongeItem[] = recentCongesRaw.map(
    (c: {
      id: string;
      type: string;
      statut: string;
      dateDebut: Date;
      dateFin: Date;
      nbJours: number;
      employe: { nom: string; prenom: string; antenne: { nom: string } | null };
    }) => ({
      id: c.id,
      employeNom: c.employe.nom,
      employePrenom: c.employe.prenom,
      type: c.type,
      statut: c.statut,
      dateDebut: c.dateDebut.toISOString(),
      dateFin: c.dateFin.toISOString(),
      nbJours: c.nbJours,
      antenneNom: c.employe.antenne?.nom ?? null,
    })
  );

  return {
    enAttente,
    approuves,
    refuses,
    totalJoursUtilises,
    recentConges,
    congesByType,
  };
}

// ======================== RETARDS DATA ========================

async function fetchRetardsData(
  whereUser: Record<string, unknown> | undefined
): Promise<RetardsData> {
  const { start, end } = getMonthRange();
  const userFilter = whereUser ? { user: whereUser } : {};

  const [retardsMois, absencesMois, retardsWithMinutes, recentRetardsRaw] =
    await Promise.all([
      prisma.pointage.count({
        where: {
          statut: "RETARD",
          date: { gte: start, lte: end },
          ...userFilter,
        },
      }),
      prisma.pointage.count({
        where: {
          statut: "ABSENT",
          date: { gte: start, lte: end },
          ...userFilter,
        },
      }),
      prisma.pointage.findMany({
        where: {
          statut: "RETARD",
          date: { gte: start, lte: end },
          ...userFilter,
        },
        select: { retardMinutes: true, userId: true },
      }),
      prisma.pointage.findMany({
        where: {
          statut: "RETARD",
          ...userFilter,
        },
        take: 8,
        orderBy: { date: "desc" },
        select: {
          id: true,
          date: true,
          retardMinutes: true,
          user: {
            select: {
              nom: true,
              prenom: true,
              antenne: { select: { nom: true } },
            },
          },
        },
      }),
    ]);

  const totalRetardMinutes = retardsWithMinutes.reduce(
    (sum: number, p: { retardMinutes: number }) => sum + p.retardMinutes,
    0
  );

  const uniqueEmployees = new Set(
    retardsWithMinutes.map((p: { userId: string }) => p.userId)
  );

  const recentRetards: RetardItem[] = recentRetardsRaw.map(
    (p: {
      id: string;
      date: Date;
      retardMinutes: number;
      user: { nom: string; prenom: string; antenne: { nom: string } | null };
    }) => ({
      id: p.id,
      employeNom: p.user.nom,
      employePrenom: p.user.prenom,
      date: p.date.toISOString(),
      retardMinutes: p.retardMinutes,
      antenneNom: p.user.antenne?.nom ?? null,
    })
  );

  // Retards by day of week (current month)
  const dayBuckets: number[] = [0, 0, 0, 0, 0, 0, 0];
  const allRetardsMonth = await prisma.pointage.findMany({
    where: {
      statut: "RETARD",
      date: { gte: start, lte: end },
      ...userFilter,
    },
    select: { date: true },
  });
  for (const p of allRetardsMonth) {
    const day = new Date(p.date).getDay();
    dayBuckets[day]++;
  }
  const retardsByDay: ChartDataPoint[] = [1, 2, 3, 4, 5].map((d: number) => ({
    name: JOUR_LABELS[d],
    value: dayBuckets[d],
  }));

  return {
    totalRetardsMois: retardsMois,
    totalAbsencesMois: absencesMois,
    totalRetardMinutes,
    employesAvecRetard: uniqueEmployees.size,
    recentRetards,
    retardsByDay,
  };
}

// ======================== MAIN FUNCTION ========================

export async function fetchDashboardData(
  userId: string,
  role: string,
  antenneId: string | null
): Promise<DashboardData> {
  switch (role) {
    case "SUPER_ADMIN":
      return fetchSuperAdminData();
    case "RESPONSABLE_ANTENNE":
      return fetchResponsableData(antenneId);
    default:
      return fetchEmployeData(userId);
  }
}

// ======================== SUPER_ADMIN ========================

async function fetchSuperAdminData(): Promise<DashboardData> {
  const [
    activitesTotal,
    activitesRealisees,
    activitesEnRetard,
    recommandationsTotal,
    recommandationsResolues,
    recommandationsEnRetard,
    employesTotal,
    congesEnAttente,
    allActivites,
    allRecommandations,
    recentActivitesRaw,
    recentRecommandationsRaw,
    antennesWithCounts,
    congesData,
    retardsData,
  ] = await Promise.all([
    prisma.activite.count(),
    prisma.activite.count({ where: { statut: "REALISEE" } }),
    prisma.activite.count({ where: { statut: "EN_RETARD" } }),
    prisma.recommandation.count(),
    prisma.recommandation.count({ where: { statut: "RESOLUE" } }),
    prisma.recommandation.count({ where: { statut: "EN_RETARD" } }),
    prisma.user.count({ where: { isActive: true } }),
    prisma.conge.count({ where: { statut: "SOUMIS" } }),
    prisma.activite.findMany({
      select: { statut: true, createdAt: true },
    }),
    prisma.recommandation.findMany({
      select: { statut: true, createdAt: true },
    }),
    prisma.activite.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        titre: true,
        statut: true,
        dateDebut: true,
        dateFin: true,
        projet: { select: { nom: true } },
      },
    }),
    prisma.recommandation.findMany({
      take: 5,
      where: { statut: "EN_RETARD" },
      orderBy: { dateEcheance: "asc" },
      select: {
        id: true,
        titre: true,
        statut: true,
        priorite: true,
        dateEcheance: true,
        antenne: { select: { nom: true } },
      },
    }),
    prisma.antenne.findMany({
      where: { isActive: true },
      select: {
        nom: true,
        _count: {
          select: { activiteAntennes: true },
        },
      },
    }),
    fetchCongesData(undefined),
    fetchRetardsData(undefined),
  ]);

  const kpis = computeKPIs({
    activitesTotal,
    activitesRealisees,
    activitesEnRetard,
    recommandationsTotal,
    recommandationsResolues,
    recommandationsEnRetard,
    employesTotal,
    congesEnAttente,
  });

  const activitesByStatus = groupByStatus(
    (allActivites as StatusCreatedAt[]).map((a: StatusCreatedAt) => ({
      statut: a.statut,
    })),
    STATUT_ACTIVITE_LABELS
  );

  const recommandationsByStatus = groupByStatus(
    (allRecommandations as StatusCreatedAt[]).map((r: StatusCreatedAt) => ({
      statut: r.statut,
    })),
    STATUT_RECOMMANDATION_LABELS
  );

  const activitesByMonth = groupByMonth(
    (allActivites as StatusCreatedAt[]).map((a: StatusCreatedAt) => ({
      createdAt: a.createdAt,
    }))
  );

  const performanceByAntenne: ChartDataPoint[] = (
    antennesWithCounts as AntenneCount[]
  ).map((a: AntenneCount) => ({
    name: a.nom,
    value: a._count.activiteAntennes,
  }));

  const recentActivites: RecentActivite[] = (
    recentActivitesRaw as ActiviteRow[]
  ).map((a: ActiviteRow) => ({
    id: a.id,
    titre: a.titre,
    statut: a.statut,
    dateDebut: a.dateDebut?.toISOString() ?? null,
    dateFin: a.dateFin?.toISOString() ?? null,
    projetNom: a.projet?.nom ?? null,
  }));

  const recentRecommandations: RecentRecommandation[] = (
    recentRecommandationsRaw as RecommandationRow[]
  ).map((r: RecommandationRow) => ({
    id: r.id,
    titre: r.titre,
    statut: r.statut,
    priorite: r.priorite,
    dateEcheance: r.dateEcheance.toISOString(),
    antenneNom: r.antenne?.nom ?? null,
  }));

  return {
    kpis,
    activitesByStatus,
    recommandationsByStatus,
    activitesByMonth,
    performanceByAntenne,
    recentActivites,
    recentRecommandations,
    pointageSummary: null,
    congesData,
    retardsData,
  };
}

// ======================== RESPONSABLE_ANTENNE ========================

async function fetchResponsableData(
  antenneId: string | null
): Promise<DashboardData> {
  if (!antenneId) {
    return emptyDashboard();
  }

  const activiteAntenneWhere = { antenneId };

  const [
    activitesTotal,
    activitesRealisees,
    activitesEnRetard,
    recommandationsTotal,
    recommandationsResolues,
    recommandationsEnRetard,
    employesTotal,
    congesEnAttente,
    allActiviteAntennes,
    allRecommandations,
    recentActivitesRaw,
    recentRecommandationsRaw,
    congesData,
    retardsData,
  ] = await Promise.all([
    prisma.activiteAntenne.count({ where: activiteAntenneWhere }),
    prisma.activiteAntenne.count({
      where: { ...activiteAntenneWhere, statut: "REALISEE" },
    }),
    prisma.activiteAntenne.count({
      where: { ...activiteAntenneWhere, statut: "EN_RETARD" },
    }),
    prisma.recommandation.count({ where: { antenneId } }),
    prisma.recommandation.count({
      where: { antenneId, statut: "RESOLUE" },
    }),
    prisma.recommandation.count({
      where: { antenneId, statut: "EN_RETARD" },
    }),
    prisma.user.count({ where: { antenneId, isActive: true } }),
    prisma.conge.count({
      where: {
        statut: "SOUMIS",
        employe: { antenneId },
      },
    }),
    prisma.activiteAntenne.findMany({
      where: activiteAntenneWhere,
      select: {
        statut: true,
        createdAt: true,
      },
    }),
    prisma.recommandation.findMany({
      where: { antenneId },
      select: { statut: true, createdAt: true },
    }),
    prisma.activiteAntenne.findMany({
      where: activiteAntenneWhere,
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        activite: {
          select: {
            id: true,
            titre: true,
            dateDebut: true,
            dateFin: true,
            projet: { select: { nom: true } },
          },
        },
      },
    }),
    prisma.recommandation.findMany({
      where: { antenneId, statut: "EN_RETARD" },
      take: 5,
      orderBy: { dateEcheance: "asc" },
      select: {
        id: true,
        titre: true,
        statut: true,
        priorite: true,
        dateEcheance: true,
        antenne: { select: { nom: true } },
      },
    }),
    fetchCongesData({ antenneId }),
    fetchRetardsData({ antenneId }),
  ]);

  const kpis = computeKPIs({
    activitesTotal,
    activitesRealisees,
    activitesEnRetard,
    recommandationsTotal,
    recommandationsResolues,
    recommandationsEnRetard,
    employesTotal,
    congesEnAttente,
  });

  const activitesByStatus = groupByStatus(
    (allActiviteAntennes as StatusCreatedAt[]).map((a: StatusCreatedAt) => ({
      statut: a.statut,
    })),
    STATUT_ACTIVITE_LABELS
  );

  const recommandationsByStatus = groupByStatus(
    (allRecommandations as StatusCreatedAt[]).map((r: StatusCreatedAt) => ({
      statut: r.statut,
    })),
    STATUT_RECOMMANDATION_LABELS
  );

  const activitesByMonth = groupByMonth(
    (allActiviteAntennes as StatusCreatedAt[]).map((a: StatusCreatedAt) => ({
      createdAt: a.createdAt,
    }))
  );

  const recentActivites: RecentActivite[] = (
    recentActivitesRaw as ActiviteAntenneWithActivite[]
  ).map((aa: ActiviteAntenneWithActivite) => ({
    id: aa.activite.id,
    titre: aa.activite.titre,
    statut: aa.statut,
    dateDebut: aa.activite.dateDebut?.toISOString() ?? null,
    dateFin: aa.activite.dateFin?.toISOString() ?? null,
    projetNom: aa.activite.projet?.nom ?? null,
  }));

  const recentRecommandations: RecentRecommandation[] = (
    recentRecommandationsRaw as RecommandationRow[]
  ).map((r: RecommandationRow) => ({
    id: r.id,
    titre: r.titre,
    statut: r.statut,
    priorite: r.priorite,
    dateEcheance: r.dateEcheance.toISOString(),
    antenneNom: r.antenne?.nom ?? null,
  }));

  return {
    kpis,
    activitesByStatus,
    recommandationsByStatus,
    activitesByMonth,
    performanceByAntenne: [],
    recentActivites,
    recentRecommandations,
    pointageSummary: null,
    congesData,
    retardsData,
  };
}

// ======================== SOIGNANT / ADMINISTRATIF ========================

async function fetchEmployeData(userId: string): Promise<DashboardData> {
  const { startOfWeek, endOfWeek } = getWeekRange();

  const [
    myActiviteAntennes,
    myActiviteAntennesRealisees,
    myActiviteAntennesEnRetard,
    myRecommandations,
    myRecommandationsResolues,
    myRecommandationsEnRetard,
    myCongesEnAttente,
    allMyActiviteAntennes,
    allMyRecommandations,
    recentActivitesRaw,
    recentRecommandationsRaw,
    weekPointages,
    congesData,
    retardsData,
  ] = await Promise.all([
    prisma.activiteAntenne.count({ where: { responsableId: userId } }),
    prisma.activiteAntenne.count({
      where: { responsableId: userId, statut: "REALISEE" },
    }),
    prisma.activiteAntenne.count({
      where: { responsableId: userId, statut: "EN_RETARD" },
    }),
    prisma.recommandationResponsable.count({ where: { userId } }),
    prisma.recommandationResponsable.count({
      where: {
        userId,
        recommandation: { statut: "RESOLUE" },
      },
    }),
    prisma.recommandationResponsable.count({
      where: {
        userId,
        recommandation: { statut: "EN_RETARD" },
      },
    }),
    prisma.conge.count({
      where: { employeId: userId, statut: "SOUMIS" },
    }),
    prisma.activiteAntenne.findMany({
      where: { responsableId: userId },
      select: { statut: true, createdAt: true },
    }),
    prisma.recommandationResponsable.findMany({
      where: { userId },
      select: {
        recommandation: {
          select: { statut: true, createdAt: true },
        },
      },
    }),
    prisma.activiteAntenne.findMany({
      where: { responsableId: userId },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        activite: {
          select: {
            id: true,
            titre: true,
            dateDebut: true,
            dateFin: true,
            projet: { select: { nom: true } },
          },
        },
      },
    }),
    prisma.recommandationResponsable.findMany({
      where: {
        userId,
        recommandation: { statut: "EN_RETARD" },
      },
      take: 5,
      include: {
        recommandation: {
          select: {
            id: true,
            titre: true,
            statut: true,
            priorite: true,
            dateEcheance: true,
            antenne: { select: { nom: true } },
          },
        },
      },
    }),
    prisma.pointage.findMany({
      where: {
        userId,
        date: { gte: startOfWeek, lte: endOfWeek },
      },
      select: { statut: true },
    }),
    fetchCongesData({ id: userId }),
    fetchRetardsData({ id: userId }),
  ]);

  const kpis = computeKPIs({
    activitesTotal: myActiviteAntennes,
    activitesRealisees: myActiviteAntennesRealisees,
    activitesEnRetard: myActiviteAntennesEnRetard,
    recommandationsTotal: myRecommandations,
    recommandationsResolues: myRecommandationsResolues,
    recommandationsEnRetard: myRecommandationsEnRetard,
    employesTotal: 0,
    congesEnAttente: myCongesEnAttente,
  });

  const activitesByStatus = groupByStatus(
    (allMyActiviteAntennes as StatusCreatedAt[]).map(
      (a: StatusCreatedAt) => ({ statut: a.statut })
    ),
    STATUT_ACTIVITE_LABELS
  );

  const recommandationsByStatus = groupByStatus(
    (allMyRecommandations as RecoResponsableStatus[]).map(
      (rr: RecoResponsableStatus) => ({ statut: rr.recommandation.statut })
    ),
    STATUT_RECOMMANDATION_LABELS
  );

  const activitesByMonth = groupByMonth(
    (allMyActiviteAntennes as StatusCreatedAt[]).map(
      (a: StatusCreatedAt) => ({ createdAt: a.createdAt })
    )
  );

  const recentActivites: RecentActivite[] = (
    recentActivitesRaw as ActiviteAntenneWithActivite[]
  ).map((aa: ActiviteAntenneWithActivite) => ({
    id: aa.activite.id,
    titre: aa.activite.titre,
    statut: aa.statut,
    dateDebut: aa.activite.dateDebut?.toISOString() ?? null,
    dateFin: aa.activite.dateFin?.toISOString() ?? null,
    projetNom: aa.activite.projet?.nom ?? null,
  }));

  const recentRecommandations: RecentRecommandation[] = (
    recentRecommandationsRaw as RecoResponsableWithReco[]
  ).map((rr: RecoResponsableWithReco) => ({
    id: rr.recommandation.id,
    titre: rr.recommandation.titre,
    statut: rr.recommandation.statut,
    priorite: rr.recommandation.priorite,
    dateEcheance: rr.recommandation.dateEcheance.toISOString(),
    antenneNom: rr.recommandation.antenne?.nom ?? null,
  }));

  const typedPointages = weekPointages as PointageStatus[];
  const pointageSummary: PointageSummary = {
    present: typedPointages.filter(
      (p: PointageStatus) => p.statut === "PRESENT"
    ).length,
    absent: typedPointages.filter(
      (p: PointageStatus) => p.statut === "ABSENT"
    ).length,
    retard: typedPointages.filter(
      (p: PointageStatus) => p.statut === "RETARD"
    ).length,
    conge: typedPointages.filter(
      (p: PointageStatus) => p.statut === "CONGE"
    ).length,
  };

  return {
    kpis,
    activitesByStatus,
    recommandationsByStatus,
    activitesByMonth,
    performanceByAntenne: [],
    recentActivites,
    recentRecommandations,
    pointageSummary,
    congesData,
    retardsData,
  };
}

// ======================== EMPTY ========================

function emptyDashboard(): DashboardData {
  return {
    kpis: computeKPIs({
      activitesTotal: 0,
      activitesRealisees: 0,
      activitesEnRetard: 0,
      recommandationsTotal: 0,
      recommandationsResolues: 0,
      recommandationsEnRetard: 0,
      employesTotal: 0,
      congesEnAttente: 0,
    }),
    activitesByStatus: [],
    recommandationsByStatus: [],
    activitesByMonth: [],
    performanceByAntenne: [],
    recentActivites: [],
    recentRecommandations: [],
    pointageSummary: null,
    congesData: {
      enAttente: 0,
      approuves: 0,
      refuses: 0,
      totalJoursUtilises: 0,
      recentConges: [],
      congesByType: [],
    },
    retardsData: {
      totalRetardsMois: 0,
      totalAbsencesMois: 0,
      totalRetardMinutes: 0,
      employesAvecRetard: 0,
      recentRetards: [],
      retardsByDay: [],
    },
  };
}
