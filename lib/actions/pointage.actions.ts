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
import type { ActionResult } from "@/types";
import type { Pointage } from "@/app/generated/prisma/client";

// ======================== CHECK IN ========================

export async function checkIn(
  userId: string
): Promise<ActionResult<Pointage>> {
  try {
    const session = await getSessionUser();
    if (!session) {
      return { success: false, error: "Non authentifie" };
    }

    // Un employe ne peut pointer que pour lui-meme (sauf admin)
    if (
      session.id !== userId &&
      session.role !== "SUPER_ADMIN" &&
      session.role !== "RESPONSABLE_ANTENNE"
    ) {
      return { success: false, error: "Acces non autorise" };
    }

    const parsed = checkInSchema.parse({});
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Verifier qu'il n'existe pas deja un pointage pour aujourd'hui
    const existing = await prisma.pointage.findUnique({
      where: { userId_date: { userId, date: today } },
    });

    if (existing) {
      return {
        success: false,
        error: "Un pointage existe deja pour aujourd'hui",
      };
    }

    // Recuperer les parametres de l'employe
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { heureDebutFixe: true, typeJournee: true },
    });

    const heureDebut = user?.heureDebutFixe ?? FIXED_HOURS.start;

    // Calculer le statut
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

    if (
      session.id !== userId &&
      session.role !== "SUPER_ADMIN" &&
      session.role !== "RESPONSABLE_ANTENNE"
    ) {
      return { success: false, error: "Acces non autorise" };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

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

    // Recuperer les parametres de l'employe
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { heureFinFixe: true },
    });

    const heureFin = user?.heureFinFixe ?? FIXED_HOURS.end;
    const heuresSupp = computeOvertime(now, heureFin);

    const pointage = await prisma.pointage.update({
      where: { id: existing.id },
      data: {
        heureDepart: now,
        heuresSupp,
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

  // Un employe ne peut voir que ses propres pointages (sauf manager/admin)
  if (
    session.id !== userId &&
    session.role !== "SUPER_ADMIN" &&
    session.role !== "RESPONSABLE_ANTENNE"
  ) {
    throw new Error("Acces non autorise");
  }

  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0); // Dernier jour du mois

  const skip = (page - 1) * pageSize;

  const where = {
    userId,
    date: {
      gte: startDate,
      lte: endDate,
    },
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

export async function getPointagesByAntenne(
  antenneId: string,
  date: string
) {
  const session = await checkActionPermission([
    "SUPER_ADMIN",
    "RESPONSABLE_ANTENNE",
  ]);

  // Si responsable, verifier qu'il est bien de cette antenne
  if (
    session.role === "RESPONSABLE_ANTENNE" &&
    session.antenneId !== antenneId
  ) {
    throw new Error("Acces non autorise a cette antenne");
  }

  const targetDate = new Date(date);
  const dayStart = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate()
  );
  const dayEnd = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate() + 1
  );

  // Recuperer tous les employes de l'antenne avec leur pointage du jour
  const employes = await prisma.user.findMany({
    where: {
      antenneId,
      isActive: true,
    },
    select: {
      id: true,
      nom: true,
      prenom: true,
      role: true,
      pointages: {
        where: {
          date: {
            gte: dayStart,
            lt: dayEnd,
          },
        },
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

  if (
    session.id !== userId &&
    session.role !== "SUPER_ADMIN" &&
    session.role !== "RESPONSABLE_ANTENNE"
  ) {
    throw new Error("Acces non autorise");
  }

  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);

  const pointages = await prisma.pointage.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
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
      "RESPONSABLE_ANTENNE",
    ]);

    const parsed = markAbsentSchema.parse({ userId, date, observations });
    const targetDate = new Date(parsed.date);
    const dayDate = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate()
    );

    // Verifier qu'il n'y a pas deja un pointage
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
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return prisma.pointage.findUnique({
    where: { userId_date: { userId, date: today } },
  });
}
