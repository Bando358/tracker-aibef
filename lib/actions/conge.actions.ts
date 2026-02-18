"use server";

import prisma from "@/lib/prisma";
import { getSessionUser, checkActionPermission } from "@/lib/actions/auth.actions";
import { createAuditLog } from "@/lib/actions/audit.actions";
import { createNotification } from "@/lib/actions/notification.actions";
import { congeSchema } from "@/lib/validations/conge.schema";
import {
  computeBusinessDays,
  canApprove,
  getNextApprovalStatus,
} from "@/services/conge.service";
import { PAGINATION_DEFAULT, STATUT_CONGE_LABELS, TYPE_CONGE_LABELS } from "@/lib/constants";
import type { ActionResult } from "@/types";
import type { Conge, Prisma } from "@/app/generated/prisma/client";

// ======================== CONSTANTS ========================

const DEFAULT_ANNUAL_DAYS = 30;

// ======================== CREATE CONGE ========================

export async function createConge(
  data: unknown
): Promise<ActionResult<Conge>> {
  try {
    const session = await getSessionUser();
    if (!session) {
      return { success: false, error: "Non authentifie" };
    }

    const parsed = congeSchema.parse(data);
    const nbJours = computeBusinessDays(parsed.dateDebut, parsed.dateFin);

    if (nbJours <= 0) {
      return {
        success: false,
        error: "La periode selectionnee ne contient aucun jour ouvre",
      };
    }

    const conge = await prisma.conge.create({
      data: {
        type: parsed.type,
        statut: "BROUILLON",
        dateDebut: parsed.dateDebut,
        dateFin: parsed.dateFin,
        nbJours,
        motif: parsed.motif,
        employe: { connect: { id: session.id } },
      },
    });

    await createAuditLog({
      action: "CREATE",
      entite: "Conge",
      entiteId: conge.id,
      userId: session.id,
      details: `Demande de ${TYPE_CONGE_LABELS[parsed.type] ?? parsed.type} (${nbJours} jours)`,
    });

    return { success: true, data: conge };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors de la creation de la demande",
    };
  }
}

// ======================== SUBMIT CONGE ========================

export async function submitConge(
  id: string
): Promise<ActionResult<Conge>> {
  try {
    const session = await getSessionUser();
    if (!session) {
      return { success: false, error: "Non authentifie" };
    }

    const conge = await prisma.conge.findUnique({
      where: { id },
      include: {
        employe: {
          select: { antenneId: true, nom: true, prenom: true },
        },
      },
    });

    if (!conge) {
      return { success: false, error: "Demande de conge introuvable" };
    }

    if (conge.employeId !== session.id) {
      return { success: false, error: "Acces non autorise" };
    }

    if (conge.statut !== "BROUILLON") {
      return {
        success: false,
        error: "Seul un brouillon peut etre soumis",
      };
    }

    const updated = await prisma.conge.update({
      where: { id },
      data: { statut: "SOUMIS" },
    });

    // Notifier le responsable d'antenne
    if (conge.employe.antenneId) {
      const responsables = await prisma.user.findMany({
        where: {
          antenneId: conge.employe.antenneId,
          role: "RESPONSABLE_ANTENNE",
          isActive: true,
        },
        select: { id: true },
      });

      const typeLabel = TYPE_CONGE_LABELS[conge.type] ?? conge.type;

      await Promise.all(
        responsables.map((resp) =>
          createNotification({
            type: "CONGE_SOUMIS",
            titre: "Nouvelle demande de conge",
            message: `${conge.employe.prenom} ${conge.employe.nom} a soumis une demande de ${typeLabel} (${conge.nbJours} jours)`,
            userId: resp.id,
            lien: `/conges/${conge.id}`,
          })
        )
      );
    }

    await createAuditLog({
      action: "STATUS_CHANGE",
      entite: "Conge",
      entiteId: conge.id,
      userId: session.id,
      details: `Statut: BROUILLON -> SOUMIS`,
    });

    return { success: true, data: updated };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors de la soumission",
    };
  }
}

// ======================== APPROVE CONGE ========================

export async function approveConge(
  id: string,
  commentaire?: string
): Promise<ActionResult<Conge>> {
  try {
    const session = await checkActionPermission([
      "SUPER_ADMIN",
      "RESPONSABLE_ANTENNE",
    ]);

    const conge = await prisma.conge.findUnique({
      where: { id },
      include: {
        employe: { select: { nom: true, prenom: true } },
      },
    });

    if (!conge) {
      return { success: false, error: "Demande de conge introuvable" };
    }

    if (!canApprove(session.role, conge.statut)) {
      return {
        success: false,
        error: `Vous ne pouvez pas approuver un conge au statut "${STATUT_CONGE_LABELS[conge.statut] ?? conge.statut}"`,
      };
    }

    const newStatut = getNextApprovalStatus(session.role);
    const statutLabel = STATUT_CONGE_LABELS[newStatut] ?? newStatut;

    const updated = await prisma.conge.update({
      where: { id },
      data: {
        statut: newStatut,
        approbateur: { connect: { id: session.id } },
        dateApprobation: new Date(),
        commentaireApprobateur: commentaire ?? null,
      },
    });

    // Notifier l'employe
    await createNotification({
      type: "CONGE_APPROUVE",
      titre: "Demande de conge approuvee",
      message: `Votre demande de conge a ete approuvee (${statutLabel})${commentaire ? `. Commentaire: ${commentaire}` : ""}`,
      userId: conge.employeId,
      lien: `/conges/${conge.id}`,
    });

    await createAuditLog({
      action: "APPROVE",
      entite: "Conge",
      entiteId: conge.id,
      userId: session.id,
      details: `Statut: ${conge.statut} -> ${newStatut}${commentaire ? `. Commentaire: ${commentaire}` : ""}`,
    });

    return { success: true, data: updated };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors de l'approbation",
    };
  }
}

// ======================== REJECT CONGE ========================

export async function rejectConge(
  id: string,
  commentaire: string
): Promise<ActionResult<Conge>> {
  try {
    const session = await checkActionPermission([
      "SUPER_ADMIN",
      "RESPONSABLE_ANTENNE",
    ]);

    if (!commentaire || commentaire.trim().length === 0) {
      return {
        success: false,
        error: "Le commentaire est obligatoire pour un refus",
      };
    }

    const conge = await prisma.conge.findUnique({
      where: { id },
    });

    if (!conge) {
      return { success: false, error: "Demande de conge introuvable" };
    }

    if (conge.statut !== "SOUMIS" && conge.statut !== "APPROUVE_RESPONSABLE") {
      return {
        success: false,
        error: "Ce conge ne peut pas etre refuse dans son statut actuel",
      };
    }

    const updated = await prisma.conge.update({
      where: { id },
      data: {
        statut: "REFUSE",
        approbateur: { connect: { id: session.id } },
        dateApprobation: new Date(),
        commentaireApprobateur: commentaire,
      },
    });

    // Notifier l'employe
    await createNotification({
      type: "CONGE_REFUSE",
      titre: "Demande de conge refusee",
      message: `Votre demande de conge a ete refusee. Motif: ${commentaire}`,
      userId: conge.employeId,
      lien: `/conges/${conge.id}`,
    });

    await createAuditLog({
      action: "REJECT",
      entite: "Conge",
      entiteId: conge.id,
      userId: session.id,
      details: `Statut: ${conge.statut} -> REFUSE. Commentaire: ${commentaire}`,
    });

    return { success: true, data: updated };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors du refus",
    };
  }
}

// ======================== CANCEL CONGE ========================

export async function cancelConge(
  id: string
): Promise<ActionResult<Conge>> {
  try {
    const session = await getSessionUser();
    if (!session) {
      return { success: false, error: "Non authentifie" };
    }

    const conge = await prisma.conge.findUnique({ where: { id } });

    if (!conge) {
      return { success: false, error: "Demande de conge introuvable" };
    }

    // L'employe peut annuler ses propres brouillons/soumissions
    // Les managers peuvent annuler tout conge non final
    const isOwner = conge.employeId === session.id;
    const isManager =
      session.role === "SUPER_ADMIN" ||
      session.role === "RESPONSABLE_ANTENNE";

    if (!isOwner && !isManager) {
      return { success: false, error: "Acces non autorise" };
    }

    if (isOwner && !isManager) {
      if (conge.statut !== "BROUILLON" && conge.statut !== "SOUMIS") {
        return {
          success: false,
          error: "Seuls les brouillons et les demandes soumises peuvent etre annulees",
        };
      }
    }

    if (conge.statut === "ANNULE") {
      return { success: false, error: "Ce conge est deja annule" };
    }

    const updated = await prisma.conge.update({
      where: { id },
      data: { statut: "ANNULE" },
    });

    await createAuditLog({
      action: "STATUS_CHANGE",
      entite: "Conge",
      entiteId: conge.id,
      userId: session.id,
      details: `Statut: ${conge.statut} -> ANNULE`,
    });

    return { success: true, data: updated };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors de l'annulation",
    };
  }
}

// ======================== GET CONGES BY EMPLOYE ========================

export async function getCongesByEmploye(
  userId: string,
  year?: number,
  page: number = 1,
  pageSize: number = PAGINATION_DEFAULT
) {
  const session = await getSessionUser();
  if (!session) throw new Error("Non authentifie");

  // Un employe ne peut voir que ses propres conges (sauf manager/admin)
  if (
    session.id !== userId &&
    session.role !== "SUPER_ADMIN" &&
    session.role !== "RESPONSABLE_ANTENNE"
  ) {
    throw new Error("Acces non autorise");
  }

  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = { employeId: userId };

  if (year !== undefined) {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);
    where.dateDebut = { gte: startOfYear, lte: endOfYear };
  }

  const [data, total] = await Promise.all([
    prisma.conge.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        employe: { select: { nom: true, prenom: true } },
        approbateur: { select: { nom: true, prenom: true } },
      },
    }),
    prisma.conge.count({ where }),
  ]);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ======================== GET CONGES FOR APPROVAL ========================

export async function getCongesForApproval(
  antenneId?: string,
  page: number = 1,
  pageSize: number = PAGINATION_DEFAULT
) {
  const session = await checkActionPermission([
    "SUPER_ADMIN",
    "RESPONSABLE_ANTENNE",
  ]);

  const skip = (page - 1) * pageSize;

  const where: Prisma.CongeWhereInput = {};

  if (session.role === "SUPER_ADMIN") {
    where.statut = { in: ["SOUMIS", "APPROUVE_RESPONSABLE"] };
  } else {
    where.statut = "SOUMIS";
  }

  if (session.role === "RESPONSABLE_ANTENNE" && session.antenneId) {
    where.employe = { antenneId: session.antenneId };
  } else if (antenneId) {
    where.employe = { antenneId };
  }

  const [data, total] = await Promise.all([
    prisma.conge.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        employe: {
          select: {
            nom: true,
            prenom: true,
            email: true,
            antenne: { select: { nom: true } },
          },
        },
        approbateur: { select: { nom: true, prenom: true } },
      },
    }),
    prisma.conge.count({ where }),
  ]);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ======================== GET CONGE BALANCE ========================

export async function getCongeBalance(
  userId: string,
  year: number
): Promise<{
  totalDays: number;
  usedDays: number;
  pendingDays: number;
  remainingDays: number;
}> {
  const session = await getSessionUser();
  if (!session) throw new Error("Non authentifie");

  if (
    session.id !== userId &&
    session.role !== "SUPER_ADMIN" &&
    session.role !== "RESPONSABLE_ANTENNE"
  ) {
    throw new Error("Acces non autorise");
  }

  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31, 23, 59, 59);

  // Conges approuves (consommes)
  const approvedConges = await prisma.conge.findMany({
    where: {
      employeId: userId,
      dateDebut: { gte: startOfYear, lte: endOfYear },
      type: "ANNUEL",
      statut: { in: ["APPROUVE_RESPONSABLE", "APPROUVE_FINAL"] },
    },
    select: { nbJours: true },
  });

  // Conges en attente
  const pendingConges = await prisma.conge.findMany({
    where: {
      employeId: userId,
      dateDebut: { gte: startOfYear, lte: endOfYear },
      type: "ANNUEL",
      statut: { in: ["BROUILLON", "SOUMIS"] },
    },
    select: { nbJours: true },
  });

  const usedDays = approvedConges.reduce((sum, c) => sum + c.nbJours, 0);
  const pendingDays = pendingConges.reduce((sum, c) => sum + c.nbJours, 0);
  const remainingDays = DEFAULT_ANNUAL_DAYS - usedDays;

  return {
    totalDays: DEFAULT_ANNUAL_DAYS,
    usedDays,
    pendingDays,
    remainingDays: Math.max(0, remainingDays),
  };
}

// ======================== GET CONGE BY ID ========================

export async function getCongeById(id: string) {
  const session = await getSessionUser();
  if (!session) throw new Error("Non authentifie");

  const conge = await prisma.conge.findUnique({
    where: { id },
    include: {
      employe: {
        select: {
          id: true,
          nom: true,
          prenom: true,
          email: true,
          role: true,
          antenne: { select: { nom: true } },
        },
      },
      approbateur: {
        select: { nom: true, prenom: true, role: true },
      },
    },
  });

  if (!conge) return null;

  // Verifier les droits d'acces
  const isOwner = conge.employeId === session.id;
  const isManager =
    session.role === "SUPER_ADMIN" ||
    session.role === "RESPONSABLE_ANTENNE";

  if (!isOwner && !isManager) {
    throw new Error("Acces non autorise");
  }

  return conge;
}
