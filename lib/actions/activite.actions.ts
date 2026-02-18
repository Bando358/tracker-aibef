"use server";

import prisma from "@/lib/prisma";
import { PAGINATION_DEFAULT } from "@/lib/constants";
import { activiteSchema } from "@/lib/validations/activite.schema";
import { shouldAutoDetectLate, buildHistoryEntry } from "@/services/activite.service";
import { checkActionPermission, getSessionUser } from "./auth.actions";
import { createAuditLog } from "./audit.actions";
import { createNotification } from "./notification.actions";
import type {
  StatutActivite,
  Activite,
  ActiviteAntenne,
  ActiviteHistorique,
  Antenne,
  User,
  Recommandation,
  Projet,
} from "@/app/generated/prisma/client";
import type { ActionResult, PaginatedResult, SearchParams } from "@/types";

// ------------------------------------------------------------------
// Types for includes
// ------------------------------------------------------------------
type ActiviteAntenneWithRelations = ActiviteAntenne & {
  antenne: Pick<Antenne, "id" | "nom" | "code">;
  responsable: Pick<User, "id" | "nom" | "prenom" | "email">;
};

type ActiviteListItem = Activite & {
  activiteAntennes: ActiviteAntenneWithRelations[];
  createur: Pick<User, "id" | "nom" | "prenom">;
};

type ActiviteDetail = Activite & {
  activiteAntennes: ActiviteAntenneWithRelations[];
  historiques: ActiviteHistorique[];
  recommandations: Recommandation[];
  createur: Pick<User, "id" | "nom" | "prenom" | "email">;
  projet: Projet | null;
};

// ------------------------------------------------------------------
// getAllActivites
// ------------------------------------------------------------------
export async function getAllActivites(
  params: SearchParams & { statut?: StatutActivite },
  antenneId?: string
): Promise<PaginatedResult<ActiviteListItem>> {
  const user = await getSessionUser();
  if (!user) throw new Error("Non authentifie");

  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? PAGINATION_DEFAULT;
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};

  // Filtrage par statut
  if (params.statut) {
    where.statut = params.statut;
  }

  // Recherche textuelle
  if (params.search) {
    where.OR = [
      { titre: { contains: params.search, mode: "insensitive" } },
      { description: { contains: params.search, mode: "insensitive" } },
    ];
  }

  // Scope par role : les RESPONSABLE_ANTENNE ne voient que les activites de leur antenne
  if (user.role === "RESPONSABLE_ANTENNE" && user.antenneId) {
    where.activiteAntennes = {
      some: { antenneId: user.antenneId },
    };
  } else if (antenneId) {
    where.activiteAntennes = {
      some: { antenneId },
    };
  }

  // Tri
  const sortBy = params.sortBy ?? "createdAt";
  const sortOrder = params.sortOrder ?? "desc";

  const [data, total] = await Promise.all([
    prisma.activite.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder },
      include: {
        activiteAntennes: {
          include: {
            antenne: { select: { id: true, nom: true, code: true } },
            responsable: { select: { id: true, nom: true, prenom: true, email: true } },
          },
        },
        createur: { select: { id: true, nom: true, prenom: true } },
      },
    }),
    prisma.activite.count({ where }),
  ]);

  return {
    data: data as ActiviteListItem[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ------------------------------------------------------------------
// getActiviteById
// ------------------------------------------------------------------
export async function getActiviteById(
  id: string
): Promise<ActiviteDetail | null> {
  const user = await getSessionUser();
  if (!user) throw new Error("Non authentifie");

  const activite = await prisma.activite.findUnique({
    where: { id },
    include: {
      activiteAntennes: {
        include: {
          antenne: { select: { id: true, nom: true, code: true } },
          responsable: { select: { id: true, nom: true, prenom: true, email: true } },
        },
      },
      historiques: {
        orderBy: { createdAt: "desc" },
      },
      recommandations: true,
      createur: { select: { id: true, nom: true, prenom: true, email: true } },
      projet: true,
    },
  });

  if (!activite) return null;

  // Scope : les RESPONSABLE_ANTENNE ne peuvent voir que les activites liees a leur antenne
  if (user.role === "RESPONSABLE_ANTENNE" && user.antenneId) {
    const isAssigned = activite.activiteAntennes.some(
      (aa) => aa.antenneId === user.antenneId
    );
    if (!isAssigned) throw new Error("Acces non autorise");
  }

  return activite as ActiviteDetail;
}

// ------------------------------------------------------------------
// createActivite
// ------------------------------------------------------------------
export async function createActivite(
  data: unknown
): Promise<ActionResult<Activite>> {
  try {
    const session = await checkActionPermission([
      "SUPER_ADMIN",
      "RESPONSABLE_ANTENNE",
    ]);

    const parsed = activiteSchema.parse(data);

    const activite = await prisma.$transaction(async (tx) => {
      // Creer l'activite
      const newActivite = await tx.activite.create({
        data: {
          titre: parsed.titre,
          description: parsed.description ?? null,
          type: parsed.type,
          frequence: parsed.frequence ?? null,
          periodicite: parsed.periodicite ?? null,
          jourPeriodicite: parsed.periodicite === "AVANT_JOUR_DU_MOIS" ? (parsed.jourPeriodicite ?? null) : null,
          dateDebut: parsed.dateDebut ?? null,
          dateFin: parsed.dateFin ?? null,
          budget: parsed.budget ?? null,
          projet: parsed.projetId ? { connect: { id: parsed.projetId } } : undefined,
          createur: { connect: { id: session.id } },
        },
      });

      // Creer les affectations antennes
      await tx.activiteAntenne.createMany({
        data: parsed.antenneAssignments.map((assignment) => ({
          activiteId: newActivite.id,
          antenneId: assignment.antenneId,
          responsableId: assignment.responsableId,
        })),
      });

      // Creer l'entree d'historique initiale
      await tx.activiteHistorique.create({
        data: {
          activiteId: newActivite.id,
          ancienStatut: "PLANIFIEE",
          nouveauStatut: "PLANIFIEE",
          modifiePar: session.id,
          commentaire: "Creation de l'activite",
        },
      });

      return newActivite;
    });

    // Log d'audit (hors transaction pour ne pas bloquer la creation)
    await createAuditLog({
      action: "CREATE",
      entite: "Activite",
      entiteId: activite.id,
      userId: session.id,
      details: JSON.stringify({
        titre: parsed.titre,
        type: parsed.type,
        dateDebut: parsed.dateDebut,
        dateFin: parsed.dateFin,
        nbAntennes: parsed.antenneAssignments.length,
      }),
    });

    // Notifications aux responsables
    const notificationPromises = parsed.antenneAssignments.map((assignment) =>
      createNotification({
        type: "ASSIGNATION_ACTIVITE",
        titre: "Nouvelle activite assignee",
        message: `Vous avez ete designe(e) responsable de l'activite "${parsed.titre}".`,
        userId: assignment.responsableId,
        lien: `/activites/${activite.id}`,
      })
    );
    await Promise.all(notificationPromises);

    return { success: true, data: activite };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors de la creation de l'activite",
    };
  }
}

// ------------------------------------------------------------------
// updateActiviteStatut
// ------------------------------------------------------------------
export async function updateActiviteStatut(
  id: string,
  newStatut: StatutActivite,
  commentaire?: string
): Promise<ActionResult<Activite>> {
  try {
    const session = await checkActionPermission([
      "SUPER_ADMIN",
      "RESPONSABLE_ANTENNE",
    ]);

    const existingActivite = await prisma.activite.findUnique({
      where: { id },
      include: {
        activiteAntennes: {
          select: { responsableId: true },
        },
      },
    });

    if (!existingActivite) {
      return { success: false, error: "Activite introuvable" };
    }

    const oldStatut = existingActivite.statut;
    const historyEntry = buildHistoryEntry(
      oldStatut,
      newStatut,
      session.id,
      commentaire
    );

    const updatedActivite = await prisma.$transaction(async (tx) => {
      // Mettre a jour le statut
      const activite = await tx.activite.update({
        where: { id },
        data: {
          statut: newStatut,
          dateRealisee: newStatut === "REALISEE" ? new Date() : undefined,
        },
      });

      // Creer l'entree d'historique
      await tx.activiteHistorique.create({
        data: {
          activiteId: id,
          ...historyEntry,
        },
      });

      return activite;
    });

    // Log d'audit
    await createAuditLog({
      action: "STATUS_CHANGE",
      entite: "Activite",
      entiteId: id,
      userId: session.id,
      details: JSON.stringify({
        ancienStatut: oldStatut,
        nouveauStatut: newStatut,
        commentaire: commentaire ?? null,
      }),
    });

    // Notifications si passage en retard
    if (newStatut === "EN_RETARD") {
      const notificationPromises = existingActivite.activiteAntennes.map(
        (aa) =>
          createNotification({
            type: "ACTIVITE_EN_RETARD",
            titre: "Activite en retard",
            message: `L'activite "${existingActivite.titre}" est passee en retard.`,
            userId: aa.responsableId,
            lien: `/activites/${id}`,
          })
      );
      await Promise.all(notificationPromises);
    }

    return { success: true, data: updatedActivite };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors du changement de statut",
    };
  }
}

// ------------------------------------------------------------------
// deleteActivite
// ------------------------------------------------------------------
export async function deleteActivite(
  id: string
): Promise<ActionResult<void>> {
  try {
    const session = await checkActionPermission(["SUPER_ADMIN"]);

    const activite = await prisma.activite.findUnique({
      where: { id },
      select: { titre: true },
    });

    if (!activite) {
      return { success: false, error: "Activite introuvable" };
    }

    // La suppression en cascade est geree par le schema Prisma (onDelete: Cascade)
    await prisma.activite.delete({ where: { id } });

    await createAuditLog({
      action: "DELETE",
      entite: "Activite",
      entiteId: id,
      userId: session.id,
      details: JSON.stringify({ titre: activite.titre }),
    });

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors de la suppression de l'activite",
    };
  }
}

// ------------------------------------------------------------------
// detectLateActivites (cron / batch)
// ------------------------------------------------------------------
export async function detectLateActivites(): Promise<
  ActionResult<{ count: number }>
> {
  try {
    const now = new Date();

    // Trouver les activites en retard non encore marquees
    const overdueActivites = await prisma.activite.findMany({
      where: {
        dateFin: { lt: now },
        statut: {
          notIn: ["REALISEE", "ANNULEE", "EN_RETARD"],
        },
      },
      include: {
        activiteAntennes: {
          select: { responsableId: true },
        },
      },
    });

    if (overdueActivites.length === 0) {
      return { success: true, data: { count: 0 } };
    }

    // Filtrer celles qui devraient effectivement passer en retard
    const toUpdate = overdueActivites.filter((a) =>
      shouldAutoDetectLate({ dateFin: a.dateFin, statut: a.statut })
    );

    // Mettre a jour en transaction
    await prisma.$transaction(async (tx) => {
      for (const activite of toUpdate) {
        await tx.activite.update({
          where: { id: activite.id },
          data: { statut: "EN_RETARD" },
        });

        await tx.activiteHistorique.create({
          data: {
            activiteId: activite.id,
            ancienStatut: activite.statut,
            nouveauStatut: "EN_RETARD",
            modifiePar: "SYSTEME",
            commentaire: "Detection automatique de retard",
          },
        });
      }
    });

    // Envoyer les notifications aux responsables concernes
    const notificationPromises = toUpdate.flatMap((activite) =>
      activite.activiteAntennes.map((aa) =>
        createNotification({
          type: "ACTIVITE_EN_RETARD",
          titre: "Activite en retard",
          message: `L'activite "${activite.titre}" est en retard (date de fin depassee).`,
          userId: aa.responsableId,
          lien: `/activites/${activite.id}`,
        })
      )
    );
    await Promise.all(notificationPromises);

    return { success: true, data: { count: toUpdate.length } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors de la detection des retards",
    };
  }
}
