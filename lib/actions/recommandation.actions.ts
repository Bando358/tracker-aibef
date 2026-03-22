"use server";

import prisma from "@/lib/prisma";
import { PAGINATION_DEFAULT } from "@/lib/constants";
import type {
  ActionResult,
  PaginatedResult,
  SearchParams,
} from "@/types";
import type {
  Recommandation,
  StatutRecommandation,
  Priorite,
  SourceRecommandation,
} from "@/app/generated/prisma/client";
import { getSessionUser, checkActionPermission } from "./auth.actions";
import { createAuditLog } from "./audit.actions";
import { createNotification } from "./notification.actions";
import { recommandationSchema } from "@/lib/validations/recommandation.schema";
import {
  shouldAutoDetectLate,
  buildHistoryEntry,
} from "@/services/recommandation.service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RecommandationWithRelations = Recommandation & {
  responsables: {
    id: string;
    isPrincipal: boolean;
    user: { id: string; nom: string; prenom: string; email: string };
  }[];
  antenne: { id: string; nom: string } | null;
  activite: { id: string; titre: string } | null;
  historiques: {
    id: string;
    createdAt: Date;
    ancienStatut: StatutRecommandation;
    nouveauStatut: StatutRecommandation;
    commentaire: string | null;
    modifiePar: string;
  }[];
};

type RecommandationListItem = Recommandation & {
  responsables: {
    id: string;
    isPrincipal: boolean;
    user: { id: string; nom: string; prenom: string };
  }[];
  antenne: { id: string; nom: string } | null;
};

// ---------------------------------------------------------------------------
// GET ALL (paginated, role-scoped)
// ---------------------------------------------------------------------------

export async function getAllRecommandations(
  params: SearchParams & {
    statut?: StatutRecommandation;
    priorite?: Priorite;
    source?: SourceRecommandation;
    antenneId?: string;
    typeResolution?: string;
    frequence?: string;
  }
): Promise<PaginatedResult<RecommandationListItem>> {
  const user = await getSessionUser();
  if (!user) throw new Error("Non authentifie");

  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? PAGINATION_DEFAULT;
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};

  // Role scoping: RESPONSABLE_ANTENNE/ADMIN_ANTENNE sees only their antenne's recommandations
  if ((user.role === "RESPONSABLE_ANTENNE" || user.role === "ADMIN_ANTENNE") && user.antenneId) {
    where.antenneId = user.antenneId;
  } else if (user.role === "PERSONNEL") {
    // Regular employees only see recommandations they are assigned to
    where.responsables = {
      some: { userId: user.id },
    };
  }
  // SUPER_ADMIN sees all

  if (params.statut) where.statut = params.statut;
  if (params.priorite) where.priorite = params.priorite;
  if (params.source) where.source = params.source;
  if (params.antenneId) where.antenneId = params.antenneId;
  if (params.typeResolution) where.typeResolution = params.typeResolution;
  if (params.frequence) where.frequence = params.frequence;

  if (params.search) {
    where.OR = [
      { titre: { contains: params.search, mode: "insensitive" } },
      { description: { contains: params.search, mode: "insensitive" } },
    ];
  }

  const orderBy: Record<string, string> = {};
  if (params.sortBy) {
    orderBy[params.sortBy] = params.sortOrder ?? "desc";
  } else {
    orderBy.createdAt = "desc";
  }

  const [data, total] = await Promise.all([
    prisma.recommandation.findMany({
      where,
      skip,
      take: pageSize,
      orderBy,
      include: {
        responsables: {
          include: {
            user: { select: { id: true, nom: true, prenom: true } },
          },
        },
        antenne: { select: { id: true, nom: true } },
      },
    }),
    prisma.recommandation.count({ where }),
  ]);

  return {
    data: data as RecommandationListItem[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ---------------------------------------------------------------------------
// GET BY ID
// ---------------------------------------------------------------------------

export async function getRecommandationById(
  id: string
): Promise<RecommandationWithRelations | null> {
  const user = await getSessionUser();
  if (!user) throw new Error("Non authentifie");

  const rec = await prisma.recommandation.findUnique({
    where: { id },
    include: {
      responsables: {
        include: {
          user: {
            select: { id: true, nom: true, prenom: true, email: true },
          },
        },
      },
      historiques: {
        orderBy: { createdAt: "desc" },
      },
      activite: { select: { id: true, titre: true } },
      antenne: { select: { id: true, nom: true } },
    },
  });

  return rec as RecommandationWithRelations | null;
}

// ---------------------------------------------------------------------------
// CREATE
// ---------------------------------------------------------------------------

export async function createRecommandation(
  data: unknown
): Promise<ActionResult<Recommandation>> {
  try {
    const session = await checkActionPermission([
      "SUPER_ADMIN",
      "ADMIN_SIMPLE",
      "RESPONSABLE_ANTENNE",
      "ADMIN_ANTENNE",
    ]);

    const parsed = recommandationSchema.parse(data);

    const recommandation = await prisma.$transaction(async (tx) => {
      const rec = await tx.recommandation.create({
        data: {
          titre: parsed.titre,
          description: parsed.description,
          source: parsed.source,
          typeResolution: parsed.typeResolution,
          priorite: parsed.priorite,
          dateEcheance: parsed.dateEcheance,
          frequence: parsed.frequence ?? null,
          observations: parsed.observations ?? null,
          activite: parsed.activiteId ? { connect: { id: parsed.activiteId } } : undefined,
          antenne: parsed.antenneId ? { connect: { id: parsed.antenneId } } : undefined,
        },
      });

      // Create responsable assignments (first one is principal)
      const responsableData = parsed.responsableIds.map((userId, index) => ({
        recommandationId: rec.id,
        userId,
        isPrincipal: index === 0,
      }));

      await tx.recommandationResponsable.createMany({
        data: responsableData,
      });

      // Create initial history entry
      await tx.recommandationHistorique.create({
        data: {
          recommandationId: rec.id,
          ...buildHistoryEntry("EN_ATTENTE", "EN_ATTENTE", session.id, "Creation de la recommandation"),
        },
      });

      return rec;
    });

    // Audit log
    await createAuditLog({
      action: "CREATE",
      entite: "Recommandation",
      entiteId: recommandation.id,
      userId: session.id,
      details: JSON.stringify({
        titre: parsed.titre,
        source: parsed.source,
        priorite: parsed.priorite,
      }),
    });

    // Notify all assigned responsables
    await Promise.all(
      parsed.responsableIds.map((userId) =>
        createNotification({
          type: "ASSIGNATION_RECOMMANDATION",
          titre: "Nouvelle recommandation assignee",
          message: `Vous avez ete assigne a la recommandation : ${parsed.titre}`,
          userId,
          lien: `/recommandations/${recommandation.id}`,
        })
      )
    );

    return { success: true, data: recommandation };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors de la creation de la recommandation",
    };
  }
}

// ---------------------------------------------------------------------------
// UPDATE STATUS
// ---------------------------------------------------------------------------

export async function updateRecommandationStatut(
  id: string,
  newStatut: StatutRecommandation,
  commentaire?: string
): Promise<ActionResult<Recommandation>> {
  try {
    const session = await checkActionPermission([
      "SUPER_ADMIN",
      "ADMIN_SIMPLE",
      "RESPONSABLE_ANTENNE",
      "ADMIN_ANTENNE",
    ]);

    const existing = await prisma.recommandation.findUnique({
      where: { id },
      include: {
        responsables: {
          include: { user: { select: { id: true } } },
        },
      },
    });

    if (!existing) {
      return { success: false, error: "Recommandation introuvable" };
    }

    const oldStatut = existing.statut;

    const updated = await prisma.$transaction(async (tx) => {
      const rec = await tx.recommandation.update({
        where: { id },
        data: { statut: newStatut },
      });

      await tx.recommandationHistorique.create({
        data: {
          recommandationId: id,
          ...buildHistoryEntry(oldStatut, newStatut, session.id, commentaire),
        },
      });

      return rec;
    });

    // Audit log
    await createAuditLog({
      action: "STATUS_CHANGE",
      entite: "Recommandation",
      entiteId: id,
      userId: session.id,
      details: JSON.stringify({ ancienStatut: oldStatut, nouveauStatut: newStatut }),
    });

    // If the new status is EN_RETARD, notify all responsables
    if (newStatut === "EN_RETARD") {
      await Promise.all(
        existing.responsables.map((r) =>
          createNotification({
            type: "RECOMMANDATION_EN_RETARD",
            titre: "Recommandation en retard",
            message: `La recommandation "${existing.titre}" est en retard`,
            userId: r.user.id,
            lien: `/recommandations/${id}`,
          })
        )
      );
    }

    return { success: true, data: updated };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors de la mise a jour du statut",
    };
  }
}

// ---------------------------------------------------------------------------
// RESOLVE
// ---------------------------------------------------------------------------

export async function resolveRecommandation(
  id: string,
  observations: string
): Promise<ActionResult<Recommandation>> {
  try {
    const session = await checkActionPermission([
      "SUPER_ADMIN",
      "ADMIN_SIMPLE",
      "RESPONSABLE_ANTENNE",
      "ADMIN_ANTENNE",
    ]);

    const existing = await prisma.recommandation.findUnique({
      where: { id },
    });

    if (!existing) {
      return { success: false, error: "Recommandation introuvable" };
    }

    const oldStatut = existing.statut;

    const updated = await prisma.$transaction(async (tx) => {
      const rec = await tx.recommandation.update({
        where: { id },
        data: {
          statut: "RESOLUE",
          dateResolution: new Date(),
          observations,
        },
      });

      await tx.recommandationHistorique.create({
        data: {
          recommandationId: id,
          ...buildHistoryEntry(
            oldStatut,
            "RESOLUE",
            session.id,
            `Resolution : ${observations}`
          ),
        },
      });

      return rec;
    });

    await createAuditLog({
      action: "STATUS_CHANGE",
      entite: "Recommandation",
      entiteId: id,
      userId: session.id,
      details: JSON.stringify({ ancienStatut: oldStatut, nouveauStatut: "RESOLUE" }),
    });

    return { success: true, data: updated };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors de la resolution de la recommandation",
    };
  }
}

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------

export async function deleteRecommandation(
  id: string
): Promise<ActionResult<void>> {
  try {
    const session = await checkActionPermission(["SUPER_ADMIN", "ADMIN_SIMPLE"]);

    const existing = await prisma.recommandation.findUnique({
      where: { id },
      select: { titre: true },
    });

    if (!existing) {
      return { success: false, error: "Recommandation introuvable" };
    }

    // Cascade delete (relations have onDelete: Cascade in the schema)
    await prisma.recommandation.delete({ where: { id } });

    await createAuditLog({
      action: "DELETE",
      entite: "Recommandation",
      entiteId: id,
      userId: session.id,
      details: JSON.stringify({ titre: existing.titre }),
    });

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors de la suppression de la recommandation",
    };
  }
}

// ---------------------------------------------------------------------------
// DETECT LATE RECOMMANDATIONS (batch job)
// ---------------------------------------------------------------------------

export async function detectLateRecommandations(): Promise<
  ActionResult<{ count: number }>
> {
  try {
    const session = await checkActionPermission(["SUPER_ADMIN", "ADMIN_SIMPLE"]);

    // Find all non-terminal recommandations that are past their deadline
    const overdue = await prisma.recommandation.findMany({
      where: {
        statut: { notIn: ["RESOLUE", "ANNULEE", "EN_RETARD"] },
        dateEcheance: { lt: new Date() },
      },
      include: {
        responsables: {
          include: { user: { select: { id: true } } },
        },
      },
    });

    // Filter using business logic
    const toUpdate = overdue.filter((rec) =>
      shouldAutoDetectLate({
        dateEcheance: rec.dateEcheance,
        statut: rec.statut,
      })
    );

    if (toUpdate.length === 0) {
      return { success: true, data: { count: 0 } };
    }

    // Batch update all overdue recommandations
    await prisma.$transaction(async (tx) => {
      for (const rec of toUpdate) {
        await tx.recommandation.update({
          where: { id: rec.id },
          data: { statut: "EN_RETARD" },
        });

        await tx.recommandationHistorique.create({
          data: {
            recommandationId: rec.id,
            ...buildHistoryEntry(
              rec.statut,
              "EN_RETARD",
              session.id,
              "Detection automatique de retard"
            ),
          },
        });
      }
    });

    // Notify all responsables of overdue recommandations
    const notificationPromises: Promise<unknown>[] = [];
    for (const rec of toUpdate) {
      for (const resp of rec.responsables) {
        notificationPromises.push(
          createNotification({
            type: "RECOMMANDATION_EN_RETARD",
            titre: "Recommandation en retard",
            message: `La recommandation "${rec.titre}" est en retard`,
            userId: resp.user.id,
            lien: `/recommandations/${rec.id}`,
          })
        );
      }
    }
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

// ======================== UPDATE TAUX MISE EN OEUVRE ========================

export async function updateTauxMiseEnOeuvre(
  id: string,
  taux: number
): Promise<ActionResult<void>> {
  try {
    const session = await checkActionPermission([
      "SUPER_ADMIN",
      "ADMIN_SIMPLE",
      "RESPONSABLE_ANTENNE",
      "ADMIN_ANTENNE",
    ]);

    if (taux < 0 || taux > 100) {
      return { success: false, error: "Le taux doit etre entre 0 et 100" };
    }

    const reco = await prisma.recommandation.findUnique({ where: { id } });
    if (!reco) return { success: false, error: "Recommandation introuvable" };

    await prisma.recommandation.update({
      where: { id },
      data: {
        tauxMiseEnOeuvre: taux,
        // Auto-update statut si 100%
        ...(taux === 100 && reco.statut !== "RESOLUE"
          ? { statut: "RESOLUE", dateResolution: new Date() }
          : {}),
      },
    });

    await createAuditLog({
      action: "UPDATE",
      entite: "Recommandation",
      entiteId: id,
      userId: session.id,
      details: JSON.stringify({ tauxMiseEnOeuvre: taux }),
    });

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur",
    };
  }
}

// ======================== RESET PERIODIQUE DES RECOMMANDATIONS ========================

/**
 * Reinitialise le statut des recommandations PERMANENTE et PERIODIQUE
 * dont la periode est ecoulee (mensuelle ou trimestrielle).
 * - PERMANENTE : revue chaque mois (si frequence MENSUELLE) ou chaque trimestre (si TRIMESTRIELLE)
 * - PERIODIQUE : idem, selon la frequence definie
 * - PONCTUELLE : pas de reset
 *
 * Les recommandations RESOLUE sont remises en EN_ATTENTE avec historique.
 * Les recommandations ANNULEE ne sont pas touchees.
 *
 * Appelee automatiquement par le cron /api/cron.
 */
export async function resetRecommandationsPeriodiques(): Promise<{
  resetCount: number;
  errors: string[];
}> {
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-11
  const currentYear = now.getFullYear();

  // Recuperer les recommandations permanentes et periodiques non annulees
  const recommandations = await prisma.recommandation.findMany({
    where: {
      typeResolution: { in: ["PERMANENTE", "PERIODIQUE"] },
      frequence: { not: null },
      statut: { not: "ANNULEE" },
    },
    select: {
      id: true,
      titre: true,
      typeResolution: true,
      frequence: true,
      statut: true,
      dernierResetPeriode: true,
      createdAt: true,
    },
  });

  let resetCount = 0;
  const errors: string[] = [];

  for (const reco of recommandations) {
    try {
      const lastReset = reco.dernierResetPeriode ?? reco.createdAt;
      const lastResetMonth = lastReset.getMonth();
      const lastResetYear = lastReset.getFullYear();

      let shouldReset = false;

      // Calculer le nombre de mois ecoules depuis le dernier reset
      const monthsElapsed =
        (currentYear - lastResetYear) * 12 + (currentMonth - lastResetMonth);

      if (reco.frequence === "BIMESTRIELLE") {
        // 2 fois par mois: reset si au moins 15 jours ecoules
        const daysDiff = Math.floor(
          (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24)
        );
        shouldReset = daysDiff >= 15;
      } else if (reco.frequence === "MENSUELLE") {
        shouldReset = monthsElapsed >= 1;
      } else if (reco.frequence === "BIMENSUELLE") {
        // Tous les 2 mois
        shouldReset = monthsElapsed >= 2;
      } else if (reco.frequence === "TRIMESTRIELLE") {
        shouldReset = monthsElapsed >= 3;
      } else if (reco.frequence === "SEMESTRIELLE") {
        shouldReset = monthsElapsed >= 6;
      } else if (reco.frequence === "ANNUELLE") {
        shouldReset = monthsElapsed >= 12;
      }

      if (!shouldReset) continue;

      // Ne reset que si le statut n'est pas deja EN_ATTENTE
      if (reco.statut === "EN_ATTENTE") {
        // Mettre a jour la date de reset sans changer le statut
        await prisma.recommandation.update({
          where: { id: reco.id },
          data: { dernierResetPeriode: now },
        });
        continue;
      }

      const ancienStatut = reco.statut;

      await prisma.$transaction([
        prisma.recommandation.update({
          where: { id: reco.id },
          data: {
            statut: "EN_ATTENTE",
            tauxMiseEnOeuvre: 0,
            dernierResetPeriode: now,
          },
        }),
        prisma.recommandationHistorique.create({
          data: {
            recommandationId: reco.id,
            ancienStatut: ancienStatut,
            nouveauStatut: "EN_ATTENTE",
            commentaire: `Reset periodique automatique (${
              ({ BIMESTRIELLE: "bimestriel", MENSUELLE: "mensuel", BIMENSUELLE: "bimensuel", TRIMESTRIELLE: "trimestriel", SEMESTRIELLE: "semestriel", ANNUELLE: "annuel" } as Record<string, string>)[reco.frequence ?? ""] ?? reco.frequence
            }) - nouvelle periode de revue`,
            modifiePar: "SYSTEME",
          },
        }),
      ]);

      resetCount++;
    } catch (err) {
      errors.push(
        `${reco.titre}: ${err instanceof Error ? err.message : "Erreur"}`
      );
    }
  }

  return { resetCount, errors };
}
