"use server";

import prisma from "@/lib/prisma";
import { PAGINATION_DEFAULT } from "@/lib/constants";
import { activiteSchema, assignAntennesSchema } from "@/lib/validations/activite.schema";
import { shouldAutoDetectLate, buildHistoryEntry, computePeriodiqueStatus } from "@/services/activite.service";
import { checkActionPermission, getSessionUser } from "./auth.actions";
import { createAuditLog } from "./audit.actions";
import { createNotification } from "./notification.actions";
import type {
  StatutActivite,
  Activite,
  ActiviteAntenne,
  ActiviteAntennePeriode,
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
type PeriodeData = Pick<
  ActiviteAntennePeriode,
  "id" | "dateDebut" | "dateFin" | "statut" | "dateRealisee" | "commentaire"
>;

type ActiviteAntenneWithRelations = ActiviteAntenne & {
  antenne: Pick<Antenne, "id" | "nom" | "code">;
  responsable: Pick<User, "id" | "nom" | "prenom" | "email"> | null;
  periodes: PeriodeData[];
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
// autoDetectLatePeriodesForActivite
// Verifie et met a jour les periodes en retard pour une activite
// ------------------------------------------------------------------
async function autoDetectLatePeriodes(activiteId: string): Promise<boolean> {
  const now = new Date();

  // Trouver les periodes depassees non encore marquees en retard
  const overduePeriodes = await prisma.activiteAntennePeriode.findMany({
    where: {
      activiteAntenne: { activiteId },
      dateFin: { lt: now },
      statut: { in: ["PLANIFIEE", "EN_COURS"] },
    },
  });

  if (overduePeriodes.length === 0) return false;

  // Passer en retard
  await prisma.activiteAntennePeriode.updateMany({
    where: { id: { in: overduePeriodes.map((p) => p.id) } },
    data: { statut: "EN_RETARD" },
  });

  // Recalculer le statut de l'activite parent si PERIODIQUE
  const activite = await prisma.activite.findUnique({
    where: { id: activiteId },
    select: { type: true, statut: true },
  });

  if (activite?.type === "PERIODIQUE") {
    const allPeriodes = await prisma.activiteAntennePeriode.findMany({
      where: { activiteAntenne: { activiteId } },
      select: { statut: true },
    });

    const newStatut = computePeriodiqueStatus(
      allPeriodes.map((p) => p.statut),
      activite.statut
    );

    if (newStatut !== activite.statut) {
      await prisma.activite.update({
        where: { id: activiteId },
        data: { statut: newStatut },
      });
      await prisma.activiteHistorique.create({
        data: {
          activiteId,
          ancienStatut: activite.statut,
          nouveauStatut: newStatut,
          modifiePar: "SYSTEME",
          commentaire: "Detection automatique : periode(s) en retard",
        },
      });
    }
  }

  return true;
}

// ------------------------------------------------------------------
// getAllActivites
// ------------------------------------------------------------------
export async function getAllActivites(
  params: SearchParams & {
    statut?: StatutActivite;
    projetId?: string;
    antenneId?: string;
    type?: string;
  },
  antenneIdOverride?: string
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

  // Filtrage par projet
  if (params.projetId) {
    where.projetId = params.projetId;
  }

  // Filtrage par type
  if (params.type) {
    where.type = params.type;
  }

  // Recherche textuelle (titre, description, code dans observations, projet)
  if (params.search) {
    where.OR = [
      { titre: { contains: params.search, mode: "insensitive" } },
      { description: { contains: params.search, mode: "insensitive" } },
      { observations: { contains: params.search, mode: "insensitive" } },
      { projet: { nom: { contains: params.search, mode: "insensitive" } } },
      { projet: { code: { contains: params.search, mode: "insensitive" } } },
    ];
  }

  // Scope par role : certains roles ne voient que les activites de leur antenne
  const ROLES_SCOPED_PAR_ANTENNE = ["RESPONSABLE_ANTENNE", "ADMIN_ANTENNE", "VOLONTAIRE", "MAJ"];
  const antenneId = params.antenneId ?? antenneIdOverride;
  if (ROLES_SCOPED_PAR_ANTENNE.includes(user.role) && user.antenneId) {
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

  // Detection automatique des periodes en retard (batch pour la page courante)
  const now = new Date();
  const overduePeriodesCount = await prisma.activiteAntennePeriode.count({
    where: {
      dateFin: { lt: now },
      statut: { in: ["PLANIFIEE", "EN_COURS"] },
    },
  });

  if (overduePeriodesCount > 0) {
    // Passer toutes les periodes depassees en retard
    await prisma.activiteAntennePeriode.updateMany({
      where: {
        dateFin: { lt: now },
        statut: { in: ["PLANIFIEE", "EN_COURS"] },
      },
      data: { statut: "EN_RETARD" },
    });

    // Recalculer les statuts des activites periodiques affectees
    const affectedAA = await prisma.activiteAntenne.findMany({
      where: {
        periodes: { some: { statut: "EN_RETARD" } },
        activite: { type: "PERIODIQUE" },
      },
      select: { activiteId: true },
      distinct: ["activiteId"],
    });

    for (const { activiteId } of affectedAA) {
      const act = await prisma.activite.findUnique({
        where: { id: activiteId },
        select: { statut: true },
      });
      if (!act) continue;

      const allP = await prisma.activiteAntennePeriode.findMany({
        where: { activiteAntenne: { activiteId } },
        select: { statut: true },
      });

      const newStatut = computePeriodiqueStatus(
        allP.map((p) => p.statut),
        act.statut
      );

      if (newStatut !== act.statut) {
        await prisma.activite.update({
          where: { id: activiteId },
          data: { statut: newStatut },
        });
      }
    }
  }

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
            periodes: { orderBy: { dateDebut: "asc" } },
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
          periodes: { orderBy: { dateDebut: "asc" } },
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

  // Scope : certains roles ne peuvent voir que les activites liees a leur antenne
  const ROLES_SCOPED = ["RESPONSABLE_ANTENNE", "ADMIN_ANTENNE", "VOLONTAIRE", "MAJ"];
  if (ROLES_SCOPED.includes(user.role) && user.antenneId) {
    const isAssigned = activite.activiteAntennes.some(
      (aa) => aa.antenneId === user.antenneId
    );
    if (!isAssigned) throw new Error("Acces non autorise");
  }

  // Detection automatique des periodes en retard au chargement
  const hadUpdates = await autoDetectLatePeriodes(id);
  if (hadUpdates) {
    // Recharger l'activite avec les statuts mis a jour
    const refreshed = await prisma.activite.findUnique({
      where: { id },
      include: {
        activiteAntennes: {
          include: {
            antenne: { select: { id: true, nom: true, code: true } },
            responsable: { select: { id: true, nom: true, prenom: true, email: true } },
            periodes: { orderBy: { dateDebut: "asc" } },
          },
        },
        historiques: { orderBy: { createdAt: "desc" } },
        recommandations: true,
        createur: { select: { id: true, nom: true, prenom: true, email: true } },
        projet: true,
      },
    });
    return refreshed as ActiviteDetail;
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
      "ADMIN_SIMPLE",
      "RESPONSABLE_ANTENNE",
      "ADMIN_ANTENNE",
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

      // Creer les affectations antennes (si fournies)
      if (parsed.antenneAssignments && parsed.antenneAssignments.length > 0) {
        await tx.activiteAntenne.createMany({
          data: parsed.antenneAssignments.map((assignment) => {
            const record: { activiteId: string; antenneId: string; responsableId?: string } = {
              activiteId: newActivite.id,
              antenneId: assignment.antenneId,
            };
            if (assignment.responsableId && assignment.responsableId !== "") {
              record.responsableId = assignment.responsableId;
            }
            return record;
          }),
        });
      }

      // Creer l'entree d'historique initiale
      await tx.activiteHistorique.create({
        data: {
          activiteId: newActivite.id,
          ancienStatut: "NON_PLANIFIEE",
          nouveauStatut: "NON_PLANIFIEE",
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

    // Notifications aux responsables (uniquement ceux definis)
    const assignmentsWithResp = (parsed.antenneAssignments ?? []).filter(
      (a) => a.responsableId && a.responsableId !== ""
    );
    if (assignmentsWithResp.length > 0) {
      const notificationPromises = assignmentsWithResp.map((assignment) =>
        createNotification({
          type: "ASSIGNATION_ACTIVITE",
          titre: "Nouvelle activite assignee",
          message: `Vous avez ete designe(e) responsable de l'activite "${parsed.titre}".`,
          userId: assignment.responsableId!,
          lien: `/activites/${activite.id}`,
        })
      );
      await Promise.all(notificationPromises);
    }

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
// updateActivite (tous les champs)
// ------------------------------------------------------------------
export async function updateActivite(
  id: string,
  data: unknown
): Promise<ActionResult<Activite>> {
  try {
    const session = await checkActionPermission([
      "SUPER_ADMIN",
      "ADMIN_SIMPLE",
      "RESPONSABLE_ANTENNE",
      "ADMIN_ANTENNE",
    ]);

    const existing = await prisma.activite.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "Activite introuvable" };
    }

    const parsed = activiteSchema.parse(data);

    const activite = await prisma.activite.update({
      where: { id },
      data: {
        titre: parsed.titre,
        description: parsed.description ?? null,
        type: parsed.type,
        frequence: parsed.frequence ?? null,
        periodicite: parsed.periodicite ?? null,
        jourPeriodicite:
          parsed.periodicite === "AVANT_JOUR_DU_MOIS"
            ? (parsed.jourPeriodicite ?? null)
            : null,
        dateDebut: parsed.dateDebut ?? null,
        dateFin: parsed.dateFin ?? null,
        budget: parsed.budget ?? null,
        projet: parsed.projetId
          ? { connect: { id: parsed.projetId } }
          : { disconnect: true },
      },
    });

    await createAuditLog({
      action: "UPDATE",
      entite: "Activite",
      entiteId: id,
      userId: session.id,
      details: JSON.stringify({
        titre: parsed.titre,
        type: parsed.type,
      }),
    });

    return { success: true, data: activite };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors de la modification de l'activite",
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
      "ADMIN_SIMPLE",
      "RESPONSABLE_ANTENNE",
      "ADMIN_ANTENNE",
      "VOLONTAIRE",
      "MAJ",
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
      const assignedWithResp = existingActivite.activiteAntennes.filter(
        (aa) => aa.responsableId
      );
      const notificationPromises = assignedWithResp.map((aa) =>
        createNotification({
          type: "ACTIVITE_EN_RETARD",
          titre: "Activite en retard",
          message: `L'activite "${existingActivite.titre}" est passee en retard.`,
          userId: aa.responsableId!,
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
    const session = await checkActionPermission(["SUPER_ADMIN", "ADMIN_SIMPLE"]);

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
    let totalUpdated = 0;

    // ---- 1. Periodes en retard (activites periodiques) ----
    const overduePeriodes = await prisma.activiteAntennePeriode.findMany({
      where: {
        dateFin: { lt: now },
        statut: { in: ["PLANIFIEE", "EN_COURS"] },
      },
      include: {
        activiteAntenne: {
          select: {
            activiteId: true,
            responsableId: true,
            activite: { select: { titre: true } },
          },
        },
      },
    });

    if (overduePeriodes.length > 0) {
      // Passer les periodes en retard
      await prisma.activiteAntennePeriode.updateMany({
        where: {
          id: { in: overduePeriodes.map((p) => p.id) },
        },
        data: { statut: "EN_RETARD" },
      });

      // Recalculer le statut des activites parentes affectees
      const affectedActiviteIds = [
        ...new Set(overduePeriodes.map((p) => p.activiteAntenne.activiteId)),
      ];

      for (const activiteId of affectedActiviteIds) {
        const activite = await prisma.activite.findUnique({
          where: { id: activiteId },
          select: { type: true, statut: true },
        });
        if (!activite || activite.type !== "PERIODIQUE") continue;

        const allPeriodes = await prisma.activiteAntennePeriode.findMany({
          where: { activiteAntenne: { activiteId } },
          select: { statut: true },
        });

        const newStatut = computePeriodiqueStatus(
          allPeriodes.map((p) => p.statut),
          activite.statut
        );

        if (newStatut !== activite.statut) {
          await prisma.activite.update({
            where: { id: activiteId },
            data: { statut: newStatut },
          });
          await prisma.activiteHistorique.create({
            data: {
              activiteId,
              ancienStatut: activite.statut,
              nouveauStatut: newStatut,
              modifiePar: "SYSTEME",
              commentaire: "Detection automatique : periode(s) en retard",
            },
          });
        }
      }

      // Notifications pour les periodes en retard
      const notifPromises = overduePeriodes
        .filter((p) => p.activiteAntenne.responsableId)
        .map((p) =>
          createNotification({
            type: "ACTIVITE_EN_RETARD",
            titre: "Periode en retard",
            message: `Une periode de l'activite "${p.activiteAntenne.activite.titre}" est en retard.`,
            userId: p.activiteAntenne.responsableId!,
            lien: `/activites/${p.activiteAntenne.activiteId}`,
          })
        );
      await Promise.all(notifPromises);

      totalUpdated += overduePeriodes.length;
    }

    // ---- 2. Activites ponctuelles en retard ----
    const overdueActivites = await prisma.activite.findMany({
      where: {
        type: "PONCTUELLE",
        dateFin: { lt: now },
        statut: {
          notIn: ["REALISEE", "ANNULEE", "EN_RETARD", "SUSPENDUE", "REPROGRAMMEE"],
        },
      },
      include: {
        activiteAntennes: {
          select: { responsableId: true },
        },
      },
    });

    const toUpdate = overdueActivites.filter((a) =>
      shouldAutoDetectLate({ dateFin: a.dateFin, statut: a.statut })
    );

    if (toUpdate.length > 0) {
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

      const notificationPromises = toUpdate.flatMap((activite) =>
        activite.activiteAntennes
          .filter((aa) => aa.responsableId)
          .map((aa) =>
            createNotification({
              type: "ACTIVITE_EN_RETARD",
              titre: "Activite en retard",
              message: `L'activite "${activite.titre}" est en retard (date de fin depassee).`,
              userId: aa.responsableId!,
              lien: `/activites/${activite.id}`,
            })
          )
      );
      await Promise.all(notificationPromises);

      totalUpdated += toUpdate.length;
    }

    return { success: true, data: { count: totalUpdated } };
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

// ------------------------------------------------------------------
// assignAntennesToActivite
// ------------------------------------------------------------------
export async function assignAntennesToActivite(
  data: unknown
): Promise<ActionResult<{ count: number }>> {
  try {
    const session = await checkActionPermission([
      "SUPER_ADMIN",
      "ADMIN_SIMPLE",
      "RESPONSABLE_ANTENNE",
      "ADMIN_ANTENNE",
    ]);

    const parsed = assignAntennesSchema.parse(data);

    const activite = await prisma.activite.findUnique({
      where: { id: parsed.activiteId },
      select: { id: true, titre: true },
    });

    if (!activite) {
      return { success: false, error: "Activite introuvable" };
    }

    // Filtrer les antennes deja affectees
    const existingAssignments = await prisma.activiteAntenne.findMany({
      where: { activiteId: parsed.activiteId },
      select: { antenneId: true },
    });
    const existingAntenneIds = new Set(existingAssignments.map((a) => a.antenneId));
    const newAssignments = parsed.assignments.filter(
      (a) => !existingAntenneIds.has(a.antenneId)
    );

    if (newAssignments.length === 0) {
      return { success: false, error: "Toutes les antennes selectionnees sont deja affectees" };
    }

    await prisma.activiteAntenne.createMany({
      data: newAssignments.map((assignment) => {
        const record: { activiteId: string; antenneId: string; responsableId?: string } = {
          activiteId: parsed.activiteId,
          antenneId: assignment.antenneId,
        };
        if (assignment.responsableId && assignment.responsableId !== "") {
          record.responsableId = assignment.responsableId;
        }
        return record;
      }),
    });

    // Log d'audit
    await createAuditLog({
      action: "UPDATE",
      entite: "Activite",
      entiteId: parsed.activiteId,
      userId: session.id,
      details: JSON.stringify({
        action: "Affectation d'antennes",
        nbAntennes: newAssignments.length,
      }),
    });

    // Notifications aux responsables definis
    const withResp = newAssignments.filter((a) => a.responsableId && a.responsableId !== "");
    if (withResp.length > 0) {
      const notificationPromises = withResp.map((assignment) =>
        createNotification({
          type: "ASSIGNATION_ACTIVITE",
          titre: "Nouvelle activite assignee",
          message: `Vous avez ete designe(e) responsable de l'activite "${activite.titre}".`,
          userId: assignment.responsableId!,
          lien: `/activites/${parsed.activiteId}`,
        })
      );
      await Promise.all(notificationPromises);
    }

    return { success: true, data: { count: newAssignments.length } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors de l'affectation des antennes",
    };
  }
}

// ------------------------------------------------------------------
// removeAntenneFromActivite
// ------------------------------------------------------------------
export async function removeAntenneFromActivite(
  activiteAntenneId: string
): Promise<ActionResult<void>> {
  try {
    const session = await checkActionPermission([
      "SUPER_ADMIN",
      "ADMIN_SIMPLE",
    ]);

    const aa = await prisma.activiteAntenne.findUnique({
      where: { id: activiteAntenneId },
      include: { antenne: { select: { nom: true } } },
    });

    if (!aa) {
      return { success: false, error: "Affectation introuvable" };
    }

    await prisma.activiteAntenne.delete({
      where: { id: activiteAntenneId },
    });

    await createAuditLog({
      action: "DELETE",
      entite: "ActiviteAntenne",
      entiteId: activiteAntenneId,
      userId: session.id,
      details: JSON.stringify({
        activiteId: aa.activiteId,
        antenne: aa.antenne.nom,
      }),
    });

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors du retrait de l'antenne",
    };
  }
}

// ------------------------------------------------------------------
// updateAntenneResponsable
// ------------------------------------------------------------------
export async function updateAntenneResponsable(
  activiteAntenneId: string,
  responsableId: string | null
): Promise<ActionResult<void>> {
  try {
    const session = await checkActionPermission([
      "SUPER_ADMIN",
      "ADMIN_SIMPLE",
      "RESPONSABLE_ANTENNE",
    ]);

    const aa = await prisma.activiteAntenne.findUnique({
      where: { id: activiteAntenneId },
      include: {
        activite: { select: { id: true, titre: true } },
      },
    });

    if (!aa) {
      return { success: false, error: "Affectation introuvable" };
    }

    await prisma.activiteAntenne.update({
      where: { id: activiteAntenneId },
      data: { responsableId },
    });

    // Log d'audit
    await createAuditLog({
      action: "UPDATE",
      entite: "ActiviteAntenne",
      entiteId: activiteAntenneId,
      userId: session.id,
      details: JSON.stringify({
        action: "Changement de responsable",
        responsableId,
      }),
    });

    // Notification au nouveau responsable
    if (responsableId) {
      await createNotification({
        type: "ASSIGNATION_ACTIVITE",
        titre: "Nouvelle activite assignee",
        message: `Vous avez ete designe(e) responsable de l'activite "${aa.activite.titre}".`,
        userId: responsableId,
        lien: `/activites/${aa.activite.id}`,
      });
    }

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors de la mise a jour du responsable",
    };
  }
}

// ------------------------------------------------------------------
// addPeriodeToActiviteAntenne
// ------------------------------------------------------------------
export async function addPeriodeToActiviteAntenne(
  activiteAntenneId: string,
  dateDebut: Date | string,
  dateFin: Date | string,
  commentaire?: string
): Promise<ActionResult<ActiviteAntennePeriode>> {
  try {
    const session = await checkActionPermission([
      "SUPER_ADMIN",
      "ADMIN_SIMPLE",
      "RESPONSABLE_ANTENNE",
      "ADMIN_ANTENNE",
      "VOLONTAIRE",
      "MAJ",
    ]);

    const aa = await prisma.activiteAntenne.findUnique({
      where: { id: activiteAntenneId },
      include: { activite: { select: { id: true, titre: true } } },
    });
    if (!aa) return { success: false, error: "Affectation introuvable" };

    const debut = new Date(dateDebut);
    const fin = new Date(dateFin);
    if (fin < debut) {
      return { success: false, error: "La date de fin doit etre posterieure a la date de debut" };
    }

    const periode = await prisma.activiteAntennePeriode.create({
      data: {
        activiteAntenneId,
        dateDebut: debut,
        dateFin: fin,
        commentaire: commentaire || null,
      },
    });

    // Si l'activite est NON_PLANIFIEE, la passer en PLANIFIEE
    const activite = await prisma.activite.findUnique({
      where: { id: aa.activite.id },
      select: { statut: true },
    });
    if (activite?.statut === "NON_PLANIFIEE") {
      await prisma.activite.update({
        where: { id: aa.activite.id },
        data: { statut: "PLANIFIEE" },
      });
      await prisma.activiteHistorique.create({
        data: {
          activiteId: aa.activite.id,
          ancienStatut: "NON_PLANIFIEE",
          nouveauStatut: "PLANIFIEE",
          modifiePar: session.id,
          commentaire: "Passage automatique : periode de realisation definie",
        },
      });
    }

    await createAuditLog({
      action: "CREATE",
      entite: "ActiviteAntennePeriode",
      entiteId: periode.id,
      userId: session.id,
      details: JSON.stringify({
        activiteId: aa.activite.id,
        dateDebut: debut,
        dateFin: fin,
      }),
    });

    return { success: true, data: periode };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de l'ajout de la periode",
    };
  }
}

// ------------------------------------------------------------------
// removePeriodeFromActiviteAntenne
// ------------------------------------------------------------------
export async function removePeriodeFromActiviteAntenne(
  periodeId: string
): Promise<ActionResult<void>> {
  try {
    const session = await checkActionPermission([
      "SUPER_ADMIN",
      "ADMIN_SIMPLE",
      "RESPONSABLE_ANTENNE",
      "ADMIN_ANTENNE",
      "VOLONTAIRE",
      "MAJ",
    ]);

    const periode = await prisma.activiteAntennePeriode.findUnique({
      where: { id: periodeId },
      include: {
        activiteAntenne: {
          select: { activiteId: true },
        },
      },
    });
    if (!periode) return { success: false, error: "Periode introuvable" };

    await prisma.activiteAntennePeriode.delete({ where: { id: periodeId } });

    // Verifier s'il reste des periodes sur l'activite
    const remainingPeriodes = await prisma.activiteAntennePeriode.count({
      where: {
        activiteAntenne: {
          activiteId: periode.activiteAntenne.activiteId,
        },
      },
    });

    // Si plus aucune periode, repasser l'activite en NON_PLANIFIEE
    if (remainingPeriodes === 0) {
      const activite = await prisma.activite.findUnique({
        where: { id: periode.activiteAntenne.activiteId },
        select: { statut: true },
      });
      if (activite?.statut === "PLANIFIEE") {
        await prisma.activite.update({
          where: { id: periode.activiteAntenne.activiteId },
          data: { statut: "NON_PLANIFIEE" },
        });
        await prisma.activiteHistorique.create({
          data: {
            activiteId: periode.activiteAntenne.activiteId,
            ancienStatut: "PLANIFIEE",
            nouveauStatut: "NON_PLANIFIEE",
            modifiePar: session.id,
            commentaire: "Passage automatique : toutes les periodes supprimees",
          },
        });
      }
    }

    await createAuditLog({
      action: "DELETE",
      entite: "ActiviteAntennePeriode",
      entiteId: periodeId,
      userId: session.id,
      details: JSON.stringify({ activiteAntenneId: periode.activiteAntenneId }),
    });

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la suppression de la periode",
    };
  }
}

// ------------------------------------------------------------------
// updatePeriodeStatut
// ------------------------------------------------------------------
export async function updatePeriodeStatut(
  periodeId: string,
  newStatut: StatutActivite,
  commentaire?: string
): Promise<ActionResult<ActiviteAntennePeriode>> {
  try {
    const session = await checkActionPermission([
      "SUPER_ADMIN",
      "ADMIN_SIMPLE",
      "RESPONSABLE_ANTENNE",
      "ADMIN_ANTENNE",
      "VOLONTAIRE",
      "MAJ",
    ]);

    const periode = await prisma.activiteAntennePeriode.findUnique({
      where: { id: periodeId },
      include: {
        activiteAntenne: {
          select: { activiteId: true },
        },
      },
    });
    if (!periode) return { success: false, error: "Periode introuvable" };

    const updated = await prisma.activiteAntennePeriode.update({
      where: { id: periodeId },
      data: {
        statut: newStatut,
        dateRealisee: newStatut === "REALISEE" ? new Date() : undefined,
        commentaire: commentaire || undefined,
      },
    });

    await createAuditLog({
      action: "STATUS_CHANGE",
      entite: "ActiviteAntennePeriode",
      entiteId: periodeId,
      userId: session.id,
      details: JSON.stringify({
        ancienStatut: periode.statut,
        nouveauStatut: newStatut,
      }),
    });

    // Recalculer le statut de l'activite parent si PERIODIQUE
    const activiteId = periode.activiteAntenne.activiteId;
    const activite = await prisma.activite.findUnique({
      where: { id: activiteId },
      select: { type: true, statut: true },
    });

    if (activite?.type === "PERIODIQUE") {
      const allPeriodes = await prisma.activiteAntennePeriode.findMany({
        where: {
          activiteAntenne: { activiteId },
        },
        select: { statut: true },
      });

      const newActiviteStatut = computePeriodiqueStatus(
        allPeriodes.map((p) => p.statut),
        activite.statut
      );

      if (newActiviteStatut !== activite.statut) {
        await prisma.activite.update({
          where: { id: activiteId },
          data: { statut: newActiviteStatut },
        });
        await prisma.activiteHistorique.create({
          data: {
            activiteId,
            ancienStatut: activite.statut,
            nouveauStatut: newActiviteStatut,
            modifiePar: "SYSTEME",
            commentaire: "Mise a jour automatique du statut (activite periodique)",
          },
        });
      }
    }

    return { success: true, data: updated };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la mise a jour de la periode",
    };
  }
}
