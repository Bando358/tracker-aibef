"use server";

import prisma from "@/lib/prisma";
import { getSessionUser, checkActionPermission } from "@/lib/actions/auth.actions";
import { createAuditLog } from "@/lib/actions/audit.actions";
import { checkInSchema, markAbsentSchema } from "@/lib/validations/pointage.schema";
import {
  computePointageStatus,
  computeOvertime,
  computeMonthSummary,
} from "@/services/pointage.service";
import { FIXED_HOURS, LATE_THRESHOLD_MINUTES, PAGINATION_DEFAULT } from "@/lib/constants";
import {
  toDateOnly,
  getMonthRange,
  getDayRange,
  validatePointageTimes,
  isJourFerie,
} from "@/lib/date-utils";
import type { ActionResult } from "@/types";
import type { Pointage, Role } from "@/app/generated/prisma/client";

// ======================== HELPER: Admin roles ========================

const ADMIN_ROLES: Role[] = [
  "SUPER_ADMIN",
  "ADMIN_SIMPLE",
  "RESPONSABLE_ANTENNE",
  "ADMIN_ANTENNE",
];

function isAdmin(role: string): boolean {
  return (ADMIN_ROLES as string[]).includes(role);
}

// ======================== CHECK IN ========================

export async function checkIn(
  userId: string
): Promise<ActionResult<Pointage>> {
  try {
    const session = await getSessionUser();
    if (!session) {
      return { success: false, error: "Non authentifie" };
    }

    if (session.id !== userId && !isAdmin(session.role)) {
      return { success: false, error: "Acces non autorise" };
    }

    const parsed = checkInSchema.parse({});
    const now = new Date();
    const today = toDateOnly(now);

    const existing = await prisma.pointage.findUnique({
      where: { userId_date: { userId, date: today } },
    });

    if (existing) {
      return {
        success: false,
        error: "Un pointage existe deja pour aujourd'hui",
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { heureDebutFixe: true, typeJournee: true },
    });

    const heureDebut = user?.heureDebutFixe ?? FIXED_HOURS.start;
    const { statut, retardMinutes } = computePointageStatus(
      now,
      heureDebut,
      LATE_THRESHOLD_MINUTES
    );

    const pointage = await prisma.pointage.create({
      data: {
        date: today,
        heureArrivee: now,
        statut,
        retardMinutes,
        observations: parsed.observations ?? null,
        user: { connect: { id: userId } },
      },
    });

    await createAuditLog({
      action: "CREATE",
      entite: "Pointage",
      entiteId: pointage.id,
      userId: session.id,
      details: `Check-in: ${statut}${retardMinutes > 0 ? ` (${retardMinutes} min de retard)` : ""}`,
    });

    return { success: true, data: pointage };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors du check-in",
    };
  }
}

// ======================== CHECK OUT ========================

export async function checkOut(
  userId: string
): Promise<ActionResult<Pointage>> {
  try {
    const session = await getSessionUser();
    if (!session) {
      return { success: false, error: "Non authentifie" };
    }

    if (session.id !== userId && !isAdmin(session.role)) {
      return { success: false, error: "Acces non autorise" };
    }

    const now = new Date();
    const today = toDateOnly(now);

    const existing = await prisma.pointage.findUnique({
      where: { userId_date: { userId, date: today } },
    });

    if (!existing) {
      return {
        success: false,
        error: "Aucun pointage trouve pour aujourd'hui. Veuillez d'abord faire le check-in.",
      };
    }

    if (existing.heureDepart) {
      return {
        success: false,
        error: "Le check-out a deja ete effectue aujourd'hui",
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { heureFinFixe: true },
    });

    const heureFin = user?.heureFinFixe ?? FIXED_HOURS.end;
    const heuresSupp = computeOvertime(now, heureFin);

    const arrivee = existing.heureArrivee;
    let totalHeures = 0;
    if (arrivee) {
      const totalMs = now.getTime() - new Date(arrivee).getTime();
      const pauseMs =
        existing.pauseDebut && existing.pauseFin
          ? new Date(existing.pauseFin).getTime() - new Date(existing.pauseDebut).getTime()
          : 0;
      totalHeures = Math.round(((totalMs - pauseMs) / 3600000) * 100) / 100;
    }

    const pointage = await prisma.pointage.update({
      where: { id: existing.id },
      data: {
        heureDepart: now,
        heuresSupp,
        totalHeures,
      },
    });

    await createAuditLog({
      action: "UPDATE",
      entite: "Pointage",
      entiteId: pointage.id,
      userId: session.id,
      details: `Check-out${heuresSupp > 0 ? ` (${heuresSupp}h supplementaires)` : ""}`,
    });

    return { success: true, data: pointage };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors du check-out",
    };
  }
}

// ======================== START PAUSE ========================

export async function startPause(
  userId: string
): Promise<ActionResult<Pointage>> {
  try {
    const session = await getSessionUser();
    if (!session) return { success: false, error: "Non authentifie" };

    if (session.id !== userId && !isAdmin(session.role)) {
      return { success: false, error: "Acces non autorise" };
    }

    const now = new Date();
    const today = toDateOnly(now);

    const existing = await prisma.pointage.findUnique({
      where: { userId_date: { userId, date: today } },
    });

    if (!existing) {
      return { success: false, error: "Veuillez d'abord faire le check-in" };
    }
    if (!existing.heureArrivee) {
      return { success: false, error: "Veuillez d'abord faire le check-in" };
    }
    if (existing.pauseDebut) {
      return { success: false, error: "La pause a deja ete commencee" };
    }

    const pointage = await prisma.pointage.update({
      where: { id: existing.id },
      data: { pauseDebut: now },
    });

    return { success: true, data: pointage };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors du debut de pause",
    };
  }
}

// ======================== END PAUSE ========================

export async function endPause(
  userId: string
): Promise<ActionResult<Pointage>> {
  try {
    const session = await getSessionUser();
    if (!session) return { success: false, error: "Non authentifie" };

    if (session.id !== userId && !isAdmin(session.role)) {
      return { success: false, error: "Acces non autorise" };
    }

    const now = new Date();
    const today = toDateOnly(now);

    const existing = await prisma.pointage.findUnique({
      where: { userId_date: { userId, date: today } },
    });

    if (!existing) {
      return { success: false, error: "Aucun pointage trouve" };
    }
    if (!existing.pauseDebut) {
      return { success: false, error: "La pause n'a pas ete commencee" };
    }
    if (existing.pauseFin) {
      return { success: false, error: "La pause a deja ete terminee" };
    }

    const pointage = await prisma.pointage.update({
      where: { id: existing.id },
      data: { pauseFin: now },
    });

    return { success: true, data: pointage };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la fin de pause",
    };
  }
}

// ======================== GET POINTAGES BY USER ========================

export async function getPointagesByUser(
  userId: string,
  month: number,
  year: number,
  page: number = 1,
  pageSize: number = PAGINATION_DEFAULT
) {
  const session = await getSessionUser();
  if (!session) throw new Error("Non authentifie");

  if (session.id !== userId && !isAdmin(session.role)) {
    throw new Error("Acces non autorise");
  }

  const { start: startDate, end: endDate } = getMonthRange(year, month + 1);

  const skip = (page - 1) * pageSize;

  const where = {
    userId,
    date: { gte: startDate, lte: endDate },
  };

  const [data, total] = await Promise.all([
    prisma.pointage.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { date: "desc" },
    }),
    prisma.pointage.count({ where }),
  ]);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ======================== GET POINTAGES BY ANTENNE ========================
// FIX: Utilise un seul niveau d'include (pas N+1)

export async function getPointagesByAntenne(
  antenneId: string | null,
  date: string
) {
  const session = await checkActionPermission(ADMIN_ROLES);

  if (
    (session.role === "RESPONSABLE_ANTENNE" || session.role === "ADMIN_ANTENNE") &&
    session.antenneId !== antenneId
  ) {
    throw new Error("Acces non autorise a cette antenne");
  }

  const { dayStart, dayEnd } = getDayRange(date);

  // Filtre: PERSONNEL uniquement (pas VOLONTAIRE/MAJ)
  const userWhere: Record<string, unknown> = {
    isActive: true,
    role: { notIn: ["VOLONTAIRE", "MAJ"] },
  };
  if (antenneId) {
    userWhere.antenneId = antenneId;
  }

  // Requete unique avec include (pas N+1)
  const employes = await prisma.user.findMany({
    where: userWhere,
    select: {
      id: true,
      nom: true,
      prenom: true,
      role: true,
      antenne: { select: { id: true, nom: true } },
      pointages: {
        where: { date: { gte: dayStart, lt: dayEnd } },
        take: 1,
      },
    },
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
  });

  return employes.map((emp) => ({
    id: emp.id,
    nom: emp.nom,
    prenom: emp.prenom,
    role: emp.role,
    antenne: emp.antenne ?? null,
    pointage: emp.pointages[0] ?? null,
  }));
}

// ======================== GET POINTAGE SUMMARY ========================

export async function getPointageSummary(
  userId: string,
  month: number,
  year: number
) {
  const session = await getSessionUser();
  if (!session) throw new Error("Non authentifie");

  if (session.id !== userId && !isAdmin(session.role)) {
    throw new Error("Acces non autorise");
  }

  const { start: startDate, end: endDate } = getMonthRange(year, month + 1);

  const pointages = await prisma.pointage.findMany({
    where: {
      userId,
      date: { gte: startDate, lte: endDate },
    },
    select: {
      statut: true,
      retardMinutes: true,
      heuresSupp: true,
    },
  });

  return computeMonthSummary(pointages);
}

// ======================== MARK ABSENT ========================

export async function markAbsent(
  userId: string,
  date: string,
  observations?: string
): Promise<ActionResult<Pointage>> {
  try {
    const session = await checkActionPermission([
      "SUPER_ADMIN",
      "ADMIN_SIMPLE",
      "RESPONSABLE_ANTENNE",
      "ADMIN_ANTENNE",
    ]);

    const parsed = markAbsentSchema.parse({ userId, date, observations });
    const dayDate = toDateOnly(parsed.date);

    const existing = await prisma.pointage.findUnique({
      where: { userId_date: { userId: parsed.userId, date: dayDate } },
    });

    if (existing) {
      return {
        success: false,
        error: "Un pointage existe deja pour cette date",
      };
    }

    const pointage = await prisma.pointage.create({
      data: {
        date: dayDate,
        statut: "ABSENT",
        observations: parsed.observations ?? null,
        user: { connect: { id: parsed.userId } },
      },
    });

    await createAuditLog({
      action: "CREATE",
      entite: "Pointage",
      entiteId: pointage.id,
      userId: session.id,
      details: `Marquage absent pour ${parsed.userId} le ${date}`,
    });

    return { success: true, data: pointage };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors du marquage absent",
    };
  }
}

// ======================== GET TODAY POINTAGE ========================

export async function getTodayPointage(userId: string) {
  const today = toDateOnly(new Date());

  return prisma.pointage.findUnique({
    where: { userId_date: { userId, date: today } },
  });
}

// ======================== SAISIE MANUELLE (CAHIER DE POINTAGE) ========================

interface PointageLigneData {
  date: string; // "YYYY-MM-DD"
  heureArrivee?: string | null; // "HH:mm"
  pauseDebut?: string | null;
  pauseFin?: string | null;
  heureDepart?: string | null;
  statut: string;
  observations?: string | null;
}

function parseTime(dateStr: string, timeStr: string | null | undefined): Date | null {
  if (!timeStr || timeStr.trim() === "") return null;
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date(dateStr);
  d.setHours(h, m, 0, 0);
  return d;
}

function computeTotalHeures(
  arrivee: Date | null,
  pauseDebut: Date | null,
  pauseFin: Date | null,
  depart: Date | null
): number {
  if (!arrivee || !depart) return 0;
  const totalMs = depart.getTime() - arrivee.getTime();
  const pauseMs =
    pauseDebut && pauseFin ? pauseFin.getTime() - pauseDebut.getTime() : 0;
  return Math.round(((totalMs - pauseMs) / 3600000) * 100) / 100;
}

export async function upsertPointageManuel(
  userId: string,
  ligne: PointageLigneData
): Promise<ActionResult<Pointage>> {
  try {
    const session = await checkActionPermission(ADMIN_ROLES);

    // Validation des heures
    const timeErrors = validatePointageTimes(
      ligne.heureArrivee,
      ligne.pauseDebut,
      ligne.pauseFin,
      ligne.heureDepart
    );
    if (timeErrors.length > 0) {
      return { success: false, error: timeErrors[0] };
    }

    const dateObj = toDateOnly(ligne.date);
    const heureArrivee = parseTime(ligne.date, ligne.heureArrivee);
    const pauseDebut = parseTime(ligne.date, ligne.pauseDebut);
    const pauseFin = parseTime(ligne.date, ligne.pauseFin);
    const heureDepart = parseTime(ligne.date, ligne.heureDepart);
    const totalHeures = computeTotalHeures(heureArrivee, pauseDebut, pauseFin, heureDepart);

    let statut = ligne.statut as "PRESENT" | "RETARD" | "ABSENT" | "CONGE" | "MISSION" | "ARRET_MALADIE" | "ABSENCE_AUTORISEE" | "ABSENCE_NON_AUTORISEE" | "FERIE";

    let retardMinutes = 0;
    if (heureArrivee && (statut === "PRESENT" || statut === "RETARD")) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { heureDebutFixe: true },
      });
      const heureDebut = user?.heureDebutFixe ?? FIXED_HOURS.start;
      const result = computePointageStatus(heureArrivee, heureDebut, LATE_THRESHOLD_MINUTES);
      statut = result.statut;
      retardMinutes = result.retardMinutes;
    }

    let heuresSupp = 0;
    if (heureDepart) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { heureFinFixe: true },
      });
      const heureFin = user?.heureFinFixe ?? FIXED_HOURS.end;
      heuresSupp = computeOvertime(heureDepart, heureFin);
    }

    // Sauvegarder les anciennes donnees pour l'audit
    const existing = await prisma.pointage.findUnique({
      where: { userId_date: { userId, date: dateObj } },
    });

    const pointage = await prisma.pointage.upsert({
      where: { userId_date: { userId, date: dateObj } },
      update: {
        heureArrivee,
        pauseDebut,
        pauseFin,
        heureDepart,
        totalHeures,
        statut,
        retardMinutes,
        heuresSupp,
        observations: ligne.observations || null,
      },
      create: {
        date: dateObj,
        heureArrivee,
        pauseDebut,
        pauseFin,
        heureDepart,
        totalHeures,
        statut,
        retardMinutes,
        heuresSupp,
        observations: ligne.observations || null,
        user: { connect: { id: userId } },
      },
    });

    // Audit trail avec diff avant/apres
    const action = existing ? "UPDATE" : "CREATE";
    let details = `Saisie manuelle ${ligne.date}: ${statut}`;
    if (existing && action === "UPDATE") {
      const changes: string[] = [];
      if (existing.statut !== statut) changes.push(`statut: ${existing.statut} -> ${statut}`);
      if (formatTimeNull(existing.heureArrivee) !== (ligne.heureArrivee || "")) changes.push(`arrivee: ${formatTimeNull(existing.heureArrivee) || "-"} -> ${ligne.heureArrivee || "-"}`);
      if (formatTimeNull(existing.heureDepart) !== (ligne.heureDepart || "")) changes.push(`depart: ${formatTimeNull(existing.heureDepart) || "-"} -> ${ligne.heureDepart || "-"}`);
      if (changes.length > 0) {
        details += ` | Modifications: ${changes.join(", ")}`;
      }
    }

    await createAuditLog({
      action,
      entite: "Pointage",
      entiteId: pointage.id,
      userId: session.id,
      details,
    });

    return { success: true, data: pointage };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la saisie",
    };
  }
}

function formatTimeNull(d: Date | null): string {
  if (!d) return "";
  const dt = new Date(d);
  return `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
}

// ======================== BULK UPSERT (SAUVEGARDER TOUT) ========================

export async function bulkUpsertPointages(
  userId: string,
  lignes: PointageLigneData[]
): Promise<ActionResult<{ saved: number; errors: string[] }>> {
  try {
    await checkActionPermission(ADMIN_ROLES);

    let saved = 0;
    const errors: string[] = [];

    for (const ligne of lignes) {
      const result = await upsertPointageManuel(userId, ligne);
      if (result.success) {
        saved++;
      } else {
        errors.push(`${ligne.date}: ${result.error}`);
      }
    }

    return {
      success: true,
      data: { saved, errors },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la saisie en lot",
    };
  }
}

// ======================== GET POINTAGES FOR MONTH ========================

export async function getPointagesForMonth(
  userId: string,
  month: number,
  year: number
): Promise<Pointage[]> {
  const session = await getSessionUser();
  if (!session) throw new Error("Non authentifie");

  const { start: startDate, end: endDate } = getMonthRange(year, month);

  return prisma.pointage.findMany({
    where: {
      userId,
      date: { gte: startDate, lte: endDate },
    },
    orderBy: { date: "asc" },
  });
}

// ======================== GET APPROVED LEAVES FOR MONTH ========================

export async function getCongesApprouvesForMonth(
  userId: string,
  month: number,
  year: number
): Promise<Array<{ dateDebut: Date; dateFin: Date; type: string }>> {
  const { start, end } = getMonthRange(year, month);

  const conges = await prisma.conge.findMany({
    where: {
      employeId: userId,
      statut: { in: ["APPROUVE_RESPONSABLE", "APPROUVE_FINAL"] },
      OR: [
        { dateDebut: { gte: start, lte: end } },
        { dateFin: { gte: start, lte: end } },
        { dateDebut: { lte: start }, dateFin: { gte: end } },
      ],
    },
    select: { dateDebut: true, dateFin: true, type: true },
  });

  return conges;
}
