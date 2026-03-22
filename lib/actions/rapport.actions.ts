"use server";

import prisma from "@/lib/prisma";
import { getSessionUser } from "./auth.actions";

// ======================== TYPES ========================

export interface RapportActiviteFilters {
  dateDebut?: string;
  dateFin?: string;
  antenneId?: string;
  projetId?: string;
}

export interface RapportRecommandationFilters {
  dateDebut?: string;
  dateFin?: string;
  antenneId?: string;
}

export interface RapportPointageFilters {
  mois: number;
  annee: number;
  antenneId?: string;
}

export interface StatItem {
  label: string;
  count: number;
}

export interface ActiviteReportRow {
  id: string;
  titre: string;
  projetCode: string | null;
  projetNom: string | null;
  statut: string;
  antennes: string[];
  nbPeriodes: number;
  nbPeriodesRealisees: number;
  budget: number | null;
}

export interface ActiviteReportData {
  total: number;
  realisees: number;
  enCours: number;
  enRetard: number;
  nonPlanifiees: number;
  suspendues: number;
  tauxRealisation: number;
  parStatut: StatItem[];
  parProjet: { code: string; nom: string; total: number; realisees: number; taux: number }[];
  activites: ActiviteReportRow[];
}

export interface RecommandationReportRow {
  id: string;
  titre: string;
  source: string;
  priorite: string;
  statut: string;
  antenne: string | null;
  dateEcheance: Date;
  responsables: string[];
}

export interface RecommandationReportData {
  total: number;
  resolues: number;
  enCours: number;
  enRetard: number;
  enAttente: number;
  tauxResolution: number;
  parStatut: StatItem[];
  parPriorite: StatItem[];
  parSource: StatItem[];
  recommandations: RecommandationReportRow[];
}

export interface PointageEmployeRow {
  userId: string;
  nom: string;
  prenom: string;
  role: string;
  joursPresent: number;
  joursRetard: number;
  joursAbsent: number;
  joursConge: number;
  joursMission: number;
  joursMaladie: number;
  joursFerie: number;
  totalHeures: number;
  totalRetardMinutes: number;
  moyArrivee: string | null;
  moyDepart: string | null;
}

export interface PointageReportData {
  moisLabel: string;
  totalEmployes: number;
  totalJoursOuvrables: number;
  tauxPresence: number;
  totalRetards: number;
  totalAbsences: number;
  totalHeuresGlobal: number;
  parStatut: StatItem[];
  employes: PointageEmployeRow[];
}

// ======================== PERFORMANCE TYPES ========================

export interface PerformanceAntenneRow {
  antenneId: string;
  antenne: string;
  totalActivites: number;
  realisees: number;
  enRetard: number;
  tauxRealisation: number;
  totalRecommandations: number;
  recommandationsResolues: number;
  tauxResolution: number;
}

export interface PerformanceEmployeRow {
  userId: string;
  nom: string;
  prenom: string;
  role: string;
  antenne: string | null;
  activitesAssignees: number;
  periodesRealisees: number;
  periodesEnRetard: number;
  totalPeriodes: number;
  tauxRealisation: number;
}

export interface PerformanceGroupeRow {
  groupe: string;
  effectif: number;
  activitesAssignees: number;
  periodesRealisees: number;
  periodesEnRetard: number;
  totalPeriodes: number;
  tauxRealisation: number;
}

export interface PerformanceReportData {
  parAntenne: PerformanceAntenneRow[];
  parEmploye: PerformanceEmployeRow[];
  parGroupe: PerformanceGroupeRow[];
}

// ======================== HELPERS ========================

function enforceAntenneScope(
  session: { role: string; antenneId: string | null },
  antenneId?: string
): string | undefined {
  if (session.role === "RESPONSABLE_ANTENNE" || session.role === "ADMIN_ANTENNE") {
    return session.antenneId ?? undefined;
  }
  return antenneId;
}

function formatMinutes(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = Math.round(totalMin % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// ======================== FILTER OPTIONS ========================

export async function fetchRapportFilterOptions() {
  const [antennes, projets] = await Promise.all([
    prisma.antenne.findMany({
      where: { isActive: true },
      select: { id: true, nom: true },
      orderBy: { nom: "asc" },
    }),
    prisma.projet.findMany({
      where: { isActive: true },
      select: { id: true, code: true, nom: true },
      orderBy: { code: "asc" },
    }),
  ]);
  return { antennes, projets };
}

// ======================== RAPPORT ACTIVITES ========================

export async function fetchActiviteReport(
  filters: RapportActiviteFilters
): Promise<ActiviteReportData> {
  const session = await getSessionUser();
  if (!session) throw new Error("Non authentifie");

  const antenneId = enforceAntenneScope(session, filters.antenneId);

  const where: Record<string, unknown> = {};
  if (filters.dateDebut || filters.dateFin) {
    where.createdAt = {};
    if (filters.dateDebut) (where.createdAt as Record<string, unknown>).gte = new Date(filters.dateDebut);
    if (filters.dateFin) (where.createdAt as Record<string, unknown>).lte = new Date(filters.dateFin);
  }
  if (filters.projetId) where.projetId = filters.projetId;
  if (antenneId) {
    where.activiteAntennes = { some: { antenneId } };
  }

  const activites = await prisma.activite.findMany({
    where,
    include: {
      projet: { select: { code: true, nom: true } },
      activiteAntennes: {
        include: {
          antenne: { select: { nom: true } },
          periodes: { select: { statut: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const total = activites.length;
  const realisees = activites.filter((a) => a.statut === "REALISEE").length;
  const enCours = activites.filter((a) => a.statut === "EN_COURS").length;
  const enRetard = activites.filter((a) => a.statut === "EN_RETARD").length;
  const nonPlanifiees = activites.filter((a) => a.statut === "NON_PLANIFIEE").length;
  const suspendues = activites.filter((a) => a.statut === "SUSPENDUE").length;

  // Par statut
  const statutCounts = new Map<string, number>();
  for (const a of activites) {
    statutCounts.set(a.statut, (statutCounts.get(a.statut) ?? 0) + 1);
  }
  const parStatut = Array.from(statutCounts.entries()).map(([label, count]) => ({ label, count }));

  // Par projet
  const projetMap = new Map<string, { code: string; nom: string; total: number; realisees: number }>();
  for (const a of activites) {
    const key = a.projetId ?? "__sans_projet__";
    const code = a.projet?.code ?? "-";
    const nom = a.projet?.nom ?? "Sans projet";
    if (!projetMap.has(key)) projetMap.set(key, { code, nom, total: 0, realisees: 0 });
    const entry = projetMap.get(key)!;
    entry.total++;
    if (a.statut === "REALISEE") entry.realisees++;
  }
  const parProjet = Array.from(projetMap.values()).map((p) => ({
    ...p,
    taux: p.total > 0 ? Math.round((p.realisees / p.total) * 100) : 0,
  }));

  // Rows
  const rows: ActiviteReportRow[] = activites.map((a) => ({
    id: a.id,
    titre: a.titre,
    projetCode: a.projet?.code ?? null,
    projetNom: a.projet?.nom ?? null,
    statut: a.statut,
    antennes: a.activiteAntennes.map((aa) => aa.antenne.nom),
    nbPeriodes: a.activiteAntennes.reduce((s, aa) => s + aa.periodes.length, 0),
    nbPeriodesRealisees: a.activiteAntennes.reduce(
      (s, aa) => s + aa.periodes.filter((p) => p.statut === "REALISEE").length,
      0
    ),
    budget: a.budget,
  }));

  return {
    total,
    realisees,
    enCours,
    enRetard,
    nonPlanifiees,
    suspendues,
    tauxRealisation: total > 0 ? Math.round((realisees / total) * 100) : 0,
    parStatut,
    parProjet,
    activites: rows,
  };
}

// ======================== RAPPORT RECOMMANDATIONS ========================

export async function fetchRecommandationReport(
  filters: RapportRecommandationFilters
): Promise<RecommandationReportData> {
  const session = await getSessionUser();
  if (!session) throw new Error("Non authentifie");

  const antenneId = enforceAntenneScope(session, filters.antenneId);

  const where: Record<string, unknown> = {};
  if (filters.dateDebut || filters.dateFin) {
    where.createdAt = {};
    if (filters.dateDebut) (where.createdAt as Record<string, unknown>).gte = new Date(filters.dateDebut);
    if (filters.dateFin) (where.createdAt as Record<string, unknown>).lte = new Date(filters.dateFin);
  }
  if (antenneId) where.antenneId = antenneId;

  const recommandations = await prisma.recommandation.findMany({
    where,
    include: {
      antenne: { select: { nom: true } },
      responsables: {
        include: {
          user: { select: { nom: true, prenom: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const total = recommandations.length;
  const resolues = recommandations.filter((r) => r.statut === "RESOLUE").length;
  const enCours = recommandations.filter((r) => r.statut === "EN_COURS").length;
  const enRetard = recommandations.filter((r) => r.statut === "EN_RETARD").length;
  const enAttente = recommandations.filter((r) => r.statut === "EN_ATTENTE").length;

  const countBy = (field: keyof typeof recommandations[0]) => {
    const map = new Map<string, number>();
    for (const r of recommandations) {
      const val = String(r[field] ?? "N/A");
      map.set(val, (map.get(val) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([label, count]) => ({ label, count }));
  };

  const rows: RecommandationReportRow[] = recommandations.map((r) => ({
    id: r.id,
    titre: r.titre,
    source: r.source,
    priorite: r.priorite,
    statut: r.statut,
    antenne: r.antenne?.nom ?? null,
    dateEcheance: r.dateEcheance,
    responsables: r.responsables.map((rr) => `${rr.user.prenom} ${rr.user.nom}`),
  }));

  return {
    total,
    resolues,
    enCours,
    enRetard,
    enAttente,
    tauxResolution: total > 0 ? Math.round((resolues / total) * 100) : 0,
    parStatut: countBy("statut"),
    parPriorite: countBy("priorite"),
    parSource: countBy("source"),
    recommandations: rows,
  };
}

// ======================== RAPPORT POINTAGE ========================

export async function fetchPointageReport(
  filters: RapportPointageFilters
): Promise<PointageReportData> {
  const session = await getSessionUser();
  if (!session) throw new Error("Non authentifie");

  const antenneId = enforceAntenneScope(session, filters.antenneId);

  const moisLabel = new Date(filters.annee, filters.mois - 1).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  const startDate = new Date(filters.annee, filters.mois - 1, 1);
  const endDate = new Date(filters.annee, filters.mois, 0);

  // Jours ouvrables (lun-ven) du mois
  let joursOuvrables = 0;
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) joursOuvrables++;
  }

  const userWhere: Record<string, unknown> = { isActive: true };
  if (antenneId) userWhere.antenneId = antenneId;
  // Exclure VOLONTAIRE et MAJ du rapport pointage
  userWhere.role = { notIn: ["VOLONTAIRE", "MAJ"] };

  const [users, pointages] = await Promise.all([
    prisma.user.findMany({
      where: userWhere,
      select: { id: true, nom: true, prenom: true, role: true },
      orderBy: { nom: "asc" },
    }),
    prisma.pointage.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        ...(antenneId ? { user: { antenneId } } : {}),
      },
      select: {
        userId: true,
        statut: true,
        heureArrivee: true,
        heureDepart: true,
        totalHeures: true,
        retardMinutes: true,
      },
    }),
  ]);

  // Grouper par user
  const pointagesByUser = new Map<string, typeof pointages>();
  for (const p of pointages) {
    if (!pointagesByUser.has(p.userId)) pointagesByUser.set(p.userId, []);
    pointagesByUser.get(p.userId)!.push(p);
  }

  let globalPresent = 0;
  let globalRetard = 0;
  let globalAbsent = 0;
  let globalHeures = 0;

  const statutGlobal = new Map<string, number>();

  const employes: PointageEmployeRow[] = users.map((u) => {
    const pts = pointagesByUser.get(u.id) ?? [];

    let present = 0, retard = 0, absent = 0, conge = 0, mission = 0, maladie = 0, ferie = 0;
    let totalH = 0, totalRetMin = 0;
    const arrivees: number[] = [];
    const departs: number[] = [];

    for (const p of pts) {
      statutGlobal.set(p.statut, (statutGlobal.get(p.statut) ?? 0) + 1);

      switch (p.statut) {
        case "PRESENT": present++; break;
        case "RETARD": retard++; present++; break;
        case "ABSENT":
        case "ABSENCE_AUTORISEE":
        case "ABSENCE_NON_AUTORISEE": absent++; break;
        case "CONGE": conge++; break;
        case "MISSION": mission++; break;
        case "ARRET_MALADIE": maladie++; break;
        case "FERIE": ferie++; break;
      }

      totalH += p.totalHeures;
      totalRetMin += p.retardMinutes;

      if (p.heureArrivee) {
        const d = new Date(p.heureArrivee);
        arrivees.push(d.getHours() * 60 + d.getMinutes());
      }
      if (p.heureDepart) {
        const d = new Date(p.heureDepart);
        departs.push(d.getHours() * 60 + d.getMinutes());
      }
    }

    globalPresent += present;
    globalRetard += retard;
    globalAbsent += absent;
    globalHeures += totalH;

    const moyArr = arrivees.length > 0
      ? formatMinutes(arrivees.reduce((a, b) => a + b, 0) / arrivees.length)
      : null;
    const moyDep = departs.length > 0
      ? formatMinutes(departs.reduce((a, b) => a + b, 0) / departs.length)
      : null;

    return {
      userId: u.id,
      nom: u.nom,
      prenom: u.prenom,
      role: u.role,
      joursPresent: present,
      joursRetard: retard,
      joursAbsent: absent,
      joursConge: conge,
      joursMission: mission,
      joursMaladie: maladie,
      joursFerie: ferie,
      totalHeures: Math.round(totalH * 10) / 10,
      totalRetardMinutes: totalRetMin,
      moyArrivee: moyArr,
      moyDepart: moyDep,
    };
  });

  const totalSlots = users.length * joursOuvrables;
  const tauxPresence = totalSlots > 0 ? Math.round((globalPresent / totalSlots) * 100) : 0;

  return {
    moisLabel,
    totalEmployes: users.length,
    totalJoursOuvrables: joursOuvrables,
    tauxPresence,
    totalRetards: globalRetard,
    totalAbsences: globalAbsent,
    totalHeuresGlobal: Math.round(globalHeures * 10) / 10,
    parStatut: Array.from(statutGlobal.entries()).map(([label, count]) => ({ label, count })),
    employes,
  };
}

// ======================== RAPPORT PERFORMANCE ========================

export async function fetchPerformanceReport(
  filters: RapportActiviteFilters
): Promise<PerformanceReportData> {
  const session = await getSessionUser();
  if (!session) throw new Error("Non authentifie");

  const antenneId = enforceAntenneScope(session, filters.antenneId);

  // --- Performance par antenne ---
  const antennes = await prisma.antenne.findMany({
    where: { isActive: true, ...(antenneId ? { id: antenneId } : {}) },
    select: { id: true, nom: true },
    orderBy: { nom: "asc" },
  });

  const parAntenne: PerformanceAntenneRow[] = [];
  for (const ant of antennes) {
    const activiteAntennes = await prisma.activiteAntenne.findMany({
      where: { antenneId: ant.id },
      include: {
        activite: { select: { statut: true } },
        periodes: { select: { statut: true } },
      },
    });

    const totalAct = activiteAntennes.length;
    const realisees = activiteAntennes.filter((aa) => aa.activite.statut === "REALISEE").length;
    const enRetard = activiteAntennes.filter((aa) => aa.activite.statut === "EN_RETARD").length;

    const recos = await prisma.recommandation.findMany({
      where: { antenneId: ant.id },
      select: { statut: true },
    });
    const totalRecos = recos.length;
    const recosResolues = recos.filter((r) => r.statut === "RESOLUE").length;

    parAntenne.push({
      antenneId: ant.id,
      antenne: ant.nom,
      totalActivites: totalAct,
      realisees,
      enRetard,
      tauxRealisation: totalAct > 0 ? Math.round((realisees / totalAct) * 100) : 0,
      totalRecommandations: totalRecos,
      recommandationsResolues: recosResolues,
      tauxResolution: totalRecos > 0 ? Math.round((recosResolues / totalRecos) * 100) : 0,
    });
  }

  // --- Performance par employe/responsable (tous les roles sauf VOLONTAIRE/MAJ) ---
  const userWhere: Record<string, unknown> = {
    isActive: true,
    role: { notIn: ["VOLONTAIRE", "MAJ"] },
  };
  if (antenneId) userWhere.antenneId = antenneId;

  const employes = await prisma.user.findMany({
    where: userWhere,
    select: {
      id: true,
      nom: true,
      prenom: true,
      role: true,
      antenne: { select: { nom: true } },
    },
    orderBy: { nom: "asc" },
  });

  const parEmploye: PerformanceEmployeRow[] = [];
  for (const emp of employes) {
    const assignements = await prisma.activiteAntenne.findMany({
      where: { responsableId: emp.id },
      include: {
        periodes: { select: { statut: true } },
      },
    });

    const totalPeriodes = assignements.reduce((s, aa) => s + aa.periodes.length, 0);
    const periodesRealisees = assignements.reduce(
      (s, aa) => s + aa.periodes.filter((p) => p.statut === "REALISEE").length,
      0
    );
    const periodesEnRetard = assignements.reduce(
      (s, aa) => s + aa.periodes.filter((p) => p.statut === "EN_RETARD").length,
      0
    );

    parEmploye.push({
      userId: emp.id,
      nom: emp.nom,
      prenom: emp.prenom,
      role: emp.role,
      antenne: emp.antenne?.nom ?? null,
      activitesAssignees: assignements.length,
      periodesRealisees,
      periodesEnRetard,
      totalPeriodes,
      tauxRealisation: totalPeriodes > 0 ? Math.round((periodesRealisees / totalPeriodes) * 100) : 0,
    });
  }

  // --- Performance par groupe (VOLONTAIRE et MAJ) ---
  const groupes: PerformanceGroupeRow[] = [];
  for (const groupe of ["VOLONTAIRE", "MAJ"] as const) {
    const membres = await prisma.user.findMany({
      where: {
        isActive: true,
        role: groupe,
        ...(antenneId ? { antenneId } : {}),
      },
      select: { id: true },
    });

    if (membres.length === 0) {
      groupes.push({
        groupe,
        effectif: 0,
        activitesAssignees: 0,
        periodesRealisees: 0,
        periodesEnRetard: 0,
        totalPeriodes: 0,
        tauxRealisation: 0,
      });
      continue;
    }

    const memberIds = membres.map((m) => m.id);
    const assignements = await prisma.activiteAntenne.findMany({
      where: { responsableId: { in: memberIds } },
      include: {
        periodes: { select: { statut: true } },
      },
    });

    const totalPeriodes = assignements.reduce((s, aa) => s + aa.periodes.length, 0);
    const periodesRealisees = assignements.reduce(
      (s, aa) => s + aa.periodes.filter((p) => p.statut === "REALISEE").length,
      0
    );
    const periodesEnRetard = assignements.reduce(
      (s, aa) => s + aa.periodes.filter((p) => p.statut === "EN_RETARD").length,
      0
    );

    groupes.push({
      groupe,
      effectif: membres.length,
      activitesAssignees: assignements.length,
      periodesRealisees,
      periodesEnRetard,
      totalPeriodes,
      tauxRealisation: totalPeriodes > 0 ? Math.round((periodesRealisees / totalPeriodes) * 100) : 0,
    });
  }

  return { parAntenne, parEmploye, parGroupe: groupes };
}

// ======================== DETAIL PERFORMANCE ANTENNE ========================

export interface PerformanceAntenneDetail {
  antenne: { id: string; nom: string; code: string };
  activites: {
    id: string;
    titre: string;
    statut: string;
    projetCode: string | null;
    totalPeriodes: number;
    periodesRealisees: number;
    periodesEnRetard: number;
    responsable: string | null;
  }[];
  recommandations: {
    id: string;
    titre: string;
    statut: string;
    priorite: string;
    tauxMiseEnOeuvre: number;
  }[];
  stats: PerformanceAntenneRow;
}

export async function fetchPerformanceAntenneDetail(
  antenneId: string
): Promise<PerformanceAntenneDetail | null> {
  const session = await getSessionUser();
  if (!session) throw new Error("Non authentifie");

  const antenne = await prisma.antenne.findUnique({
    where: { id: antenneId },
    select: { id: true, nom: true, code: true },
  });
  if (!antenne) return null;

  const activiteAntennes = await prisma.activiteAntenne.findMany({
    where: { antenneId },
    include: {
      activite: { select: { id: true, titre: true, statut: true, projet: { select: { code: true } } } },
      responsable: { select: { nom: true, prenom: true } },
      periodes: { select: { statut: true } },
    },
  });

  const activites = activiteAntennes.map((aa) => ({
    id: aa.activite.id,
    titre: aa.activite.titre,
    statut: aa.activite.statut,
    projetCode: aa.activite.projet?.code ?? null,
    totalPeriodes: aa.periodes.length,
    periodesRealisees: aa.periodes.filter((p) => p.statut === "REALISEE").length,
    periodesEnRetard: aa.periodes.filter((p) => p.statut === "EN_RETARD").length,
    responsable: aa.responsable ? `${aa.responsable.prenom} ${aa.responsable.nom}` : null,
  }));

  const recommandations = await prisma.recommandation.findMany({
    where: { antenneId },
    select: { id: true, titre: true, statut: true, priorite: true, tauxMiseEnOeuvre: true },
    orderBy: { createdAt: "desc" },
  });

  const totalAct = activites.length;
  const realisees = activites.filter((a) => a.statut === "REALISEE").length;
  const enRetard = activites.filter((a) => a.statut === "EN_RETARD").length;
  const totalRecos = recommandations.length;
  const recosResolues = recommandations.filter((r) => r.statut === "RESOLUE").length;

  return {
    antenne,
    activites,
    recommandations,
    stats: {
      antenneId: antenne.id,
      antenne: antenne.nom,
      totalActivites: totalAct,
      realisees,
      enRetard,
      tauxRealisation: totalAct > 0 ? Math.round((realisees / totalAct) * 100) : 0,
      totalRecommandations: totalRecos,
      recommandationsResolues: recosResolues,
      tauxResolution: totalRecos > 0 ? Math.round((recosResolues / totalRecos) * 100) : 0,
    },
  };
}

// ======================== DETAIL PERFORMANCE EMPLOYE ========================

export interface PerformanceEmployeDetail {
  employe: { id: string; nom: string; prenom: string; role: string; antenne: string | null };
  activites: {
    id: string;
    titre: string;
    statut: string;
    antenne: string;
    totalPeriodes: number;
    periodesRealisees: number;
    periodesEnRetard: number;
  }[];
  stats: PerformanceEmployeRow;
}

export async function fetchPerformanceEmployeDetail(
  userId: string
): Promise<PerformanceEmployeDetail | null> {
  const session = await getSessionUser();
  if (!session) throw new Error("Non authentifie");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, nom: true, prenom: true, role: true, antenne: { select: { nom: true } } },
  });
  if (!user) return null;

  const assignements = await prisma.activiteAntenne.findMany({
    where: { responsableId: userId },
    include: {
      activite: { select: { id: true, titre: true, statut: true } },
      antenne: { select: { nom: true } },
      periodes: { select: { statut: true } },
    },
  });

  const activites = assignements.map((aa) => ({
    id: aa.activite.id,
    titre: aa.activite.titre,
    statut: aa.activite.statut,
    antenne: aa.antenne.nom,
    totalPeriodes: aa.periodes.length,
    periodesRealisees: aa.periodes.filter((p) => p.statut === "REALISEE").length,
    periodesEnRetard: aa.periodes.filter((p) => p.statut === "EN_RETARD").length,
  }));

  const totalPeriodes = activites.reduce((s, a) => s + a.totalPeriodes, 0);
  const periodesRealisees = activites.reduce((s, a) => s + a.periodesRealisees, 0);
  const periodesEnRetard = activites.reduce((s, a) => s + a.periodesEnRetard, 0);

  return {
    employe: {
      id: user.id,
      nom: user.nom,
      prenom: user.prenom,
      role: user.role,
      antenne: user.antenne?.nom ?? null,
    },
    activites,
    stats: {
      userId: user.id,
      nom: user.nom,
      prenom: user.prenom,
      role: user.role,
      antenne: user.antenne?.nom ?? null,
      activitesAssignees: assignements.length,
      periodesRealisees,
      periodesEnRetard,
      totalPeriodes,
      tauxRealisation: totalPeriodes > 0 ? Math.round((periodesRealisees / totalPeriodes) * 100) : 0,
    },
  };
}

// ======================== DETAIL PERFORMANCE GROUPE ========================

export interface PerformanceGroupeDetail {
  groupe: string;
  membres: {
    userId: string;
    nom: string;
    prenom: string;
    antenne: string | null;
    activitesAssignees: number;
    periodesRealisees: number;
    periodesEnRetard: number;
    totalPeriodes: number;
    tauxRealisation: number;
  }[];
  stats: PerformanceGroupeRow;
}

export async function fetchPerformanceGroupeDetail(
  groupe: string
): Promise<PerformanceGroupeDetail | null> {
  const session = await getSessionUser();
  if (!session) throw new Error("Non authentifie");

  if (groupe !== "VOLONTAIRE" && groupe !== "MAJ") return null;

  const membres = await prisma.user.findMany({
    where: { isActive: true, role: groupe },
    select: {
      id: true,
      nom: true,
      prenom: true,
      antenne: { select: { nom: true } },
    },
    orderBy: { nom: "asc" },
  });

  const membresDetail = [];
  let totalActivites = 0, totalPeriodes = 0, totalRealisees = 0, totalEnRetard = 0;

  for (const m of membres) {
    const assignements = await prisma.activiteAntenne.findMany({
      where: { responsableId: m.id },
      include: { periodes: { select: { statut: true } } },
    });

    const nbPeriodes = assignements.reduce((s, aa) => s + aa.periodes.length, 0);
    const nbRealisees = assignements.reduce((s, aa) => s + aa.periodes.filter((p) => p.statut === "REALISEE").length, 0);
    const nbEnRetard = assignements.reduce((s, aa) => s + aa.periodes.filter((p) => p.statut === "EN_RETARD").length, 0);

    totalActivites += assignements.length;
    totalPeriodes += nbPeriodes;
    totalRealisees += nbRealisees;
    totalEnRetard += nbEnRetard;

    membresDetail.push({
      userId: m.id,
      nom: m.nom,
      prenom: m.prenom,
      antenne: m.antenne?.nom ?? null,
      activitesAssignees: assignements.length,
      periodesRealisees: nbRealisees,
      periodesEnRetard: nbEnRetard,
      totalPeriodes: nbPeriodes,
      tauxRealisation: nbPeriodes > 0 ? Math.round((nbRealisees / nbPeriodes) * 100) : 0,
    });
  }

  return {
    groupe,
    membres: membresDetail,
    stats: {
      groupe,
      effectif: membres.length,
      activitesAssignees: totalActivites,
      periodesRealisees: totalRealisees,
      periodesEnRetard: totalEnRetard,
      totalPeriodes,
      tauxRealisation: totalPeriodes > 0 ? Math.round((totalRealisees / totalPeriodes) * 100) : 0,
    },
  };
}
