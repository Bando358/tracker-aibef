"use server";

import prisma from "@/lib/prisma";
import { PAGINATION_DEFAULT } from "@/lib/constants";
import { missionSchema } from "@/lib/validations/mission.schema";
import { checkActionPermission, getSessionUser } from "./auth.actions";
import { createAuditLog } from "./audit.actions";
import type {
  StatutMission,
  Mission,
  User,
} from "@/app/generated/prisma/client";
import type { ActionResult, PaginatedResult, SearchParams } from "@/types";

// ------------------------------------------------------------------
// Types for includes
// ------------------------------------------------------------------
type MissionListItem = Mission & {
  responsable: Pick<User, "id" | "nom" | "prenom" | "email">;
  createur: Pick<User, "id" | "nom" | "prenom">;
};

type MissionDetail = Mission & {
  responsable: Pick<User, "id" | "nom" | "prenom" | "email">;
  createur: Pick<User, "id" | "nom" | "prenom" | "email">;
};

// ------------------------------------------------------------------
// getAllMissions
// ------------------------------------------------------------------
export async function getAllMissions(
  params: SearchParams & { statut?: StatutMission },
  antenneId?: string
): Promise<PaginatedResult<MissionListItem>> {
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
      { objet: { contains: params.search, mode: "insensitive" } },
      { lieu: { contains: params.search, mode: "insensitive" } },
    ];
  }

  // Scope par role : certains roles ne voient que les missions liees a leur antenne
  const ROLES_SCOPED_PAR_ANTENNE = ["RESPONSABLE_ANTENNE", "ADMIN_ANTENNE", "VOLONTAIRE", "MAJ"];
  if (ROLES_SCOPED_PAR_ANTENNE.includes(user.role) && user.antenneId) {
    // Les utilisateurs scopes ne voient que les missions ou ils sont responsable ou createur
    where.OR = [
      ...(Array.isArray(where.OR) ? where.OR : []),
      { responsableId: user.id },
      { createurId: user.id },
    ];
  } else if (antenneId) {
    // Filtrage optionnel par antenne (via le responsable)
    where.responsable = {
      antenneId,
    };
  }

  // Tri
  const sortBy = params.sortBy ?? "createdAt";
  const sortOrder = params.sortOrder ?? "desc";

  const [data, total] = await Promise.all([
    prisma.mission.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder },
      include: {
        responsable: { select: { id: true, nom: true, prenom: true, email: true } },
        createur: { select: { id: true, nom: true, prenom: true } },
      },
    }),
    prisma.mission.count({ where }),
  ]);

  return {
    data: data as MissionListItem[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ------------------------------------------------------------------
// getMissionById
// ------------------------------------------------------------------
export async function getMissionById(
  id: string
): Promise<MissionDetail | null> {
  const user = await getSessionUser();
  if (!user) throw new Error("Non authentifie");

  const mission = await prisma.mission.findUnique({
    where: { id },
    include: {
      responsable: { select: { id: true, nom: true, prenom: true, email: true } },
      createur: { select: { id: true, nom: true, prenom: true, email: true } },
    },
  });

  if (!mission) return null;

  // Scope : certains roles ne peuvent voir que les missions ou ils sont impliques
  const ROLES_SCOPED = ["RESPONSABLE_ANTENNE", "ADMIN_ANTENNE", "VOLONTAIRE", "MAJ"];
  if (ROLES_SCOPED.includes(user.role) && user.antenneId) {
    const isInvolved =
      mission.responsableId === user.id || mission.createurId === user.id;
    if (!isInvolved) throw new Error("Acces non autorise");
  }

  return mission as MissionDetail;
}

// ------------------------------------------------------------------
// createMission
// ------------------------------------------------------------------
export async function createMission(
  data: unknown
): Promise<ActionResult<Mission>> {
  try {
    const session = await checkActionPermission([
      "SUPER_ADMIN",
      "ADMIN_SIMPLE",
      "RESPONSABLE_ANTENNE",
      "ADMIN_ANTENNE",
    ]);

    const parsed = missionSchema.parse(data);

    const mission = await prisma.mission.create({
      data: {
        objet: parsed.objet,
        lieu: parsed.lieu,
        dateDebut: parsed.dateDebut,
        dateFin: parsed.dateFin,
        perDiem: parsed.perDiem ?? null,
        observations: parsed.observations ?? null,
        responsable: { connect: { id: parsed.responsableId } },
        createur: { connect: { id: session.id } },
      },
    });

    // Log d'audit
    await createAuditLog({
      action: "CREATE",
      entite: "Mission",
      entiteId: mission.id,
      userId: session.id,
      details: JSON.stringify({
        objet: parsed.objet,
        lieu: parsed.lieu,
        dateDebut: parsed.dateDebut,
        dateFin: parsed.dateFin,
        responsableId: parsed.responsableId,
      }),
    });

    return { success: true, data: mission };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors de la creation de la mission",
    };
  }
}

// ------------------------------------------------------------------
// updateMission (tous les champs)
// ------------------------------------------------------------------
export async function updateMission(
  id: string,
  data: unknown
): Promise<ActionResult<Mission>> {
  try {
    const session = await checkActionPermission([
      "SUPER_ADMIN",
      "ADMIN_SIMPLE",
      "RESPONSABLE_ANTENNE",
      "ADMIN_ANTENNE",
    ]);

    const existing = await prisma.mission.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Mission introuvable" };

    const parsed = missionSchema.parse(data);

    const mission = await prisma.mission.update({
      where: { id },
      data: {
        objet: parsed.objet,
        lieu: parsed.lieu,
        dateDebut: parsed.dateDebut,
        dateFin: parsed.dateFin,
        perDiem: parsed.perDiem ?? null,
        observations: parsed.observations ?? null,
        responsable: { connect: { id: parsed.responsableId } },
      },
    });

    await createAuditLog({
      action: "UPDATE",
      entite: "Mission",
      entiteId: id,
      userId: session.id,
      details: JSON.stringify({ objet: parsed.objet, lieu: parsed.lieu }),
    });

    return { success: true, data: mission };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la modification",
    };
  }
}

// ------------------------------------------------------------------
// updateMissionStatut
// ------------------------------------------------------------------
export async function updateMissionStatut(
  id: string,
  newStatut: StatutMission,
  rapportMission?: string
): Promise<ActionResult<Mission>> {
  try {
    const session = await checkActionPermission([
      "SUPER_ADMIN",
      "ADMIN_SIMPLE",
      "RESPONSABLE_ANTENNE",
      "ADMIN_ANTENNE",
      "VOLONTAIRE",
      "MAJ",
    ]);

    const existingMission = await prisma.mission.findUnique({
      where: { id },
    });

    if (!existingMission) {
      return { success: false, error: "Mission introuvable" };
    }

    const oldStatut = existingMission.statut;

    const updatedMission = await prisma.mission.update({
      where: { id },
      data: {
        statut: newStatut,
        rapportMission: rapportMission ?? undefined,
      },
    });

    // Log d'audit
    await createAuditLog({
      action: "STATUS_CHANGE",
      entite: "Mission",
      entiteId: id,
      userId: session.id,
      details: JSON.stringify({
        ancienStatut: oldStatut,
        nouveauStatut: newStatut,
        rapportMission: rapportMission ? "(fourni)" : null,
      }),
    });

    return { success: true, data: updatedMission };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors du changement de statut de la mission",
    };
  }
}

// ------------------------------------------------------------------
// deleteMission
// ------------------------------------------------------------------
export async function deleteMission(
  id: string
): Promise<ActionResult<void>> {
  try {
    const session = await checkActionPermission(["SUPER_ADMIN", "ADMIN_SIMPLE"]);

    const mission = await prisma.mission.findUnique({
      where: { id },
      select: { objet: true },
    });

    if (!mission) {
      return { success: false, error: "Mission introuvable" };
    }

    await prisma.mission.delete({ where: { id } });

    await createAuditLog({
      action: "DELETE",
      entite: "Mission",
      entiteId: id,
      userId: session.id,
      details: JSON.stringify({ objet: mission.objet }),
    });

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors de la suppression de la mission",
    };
  }
}
