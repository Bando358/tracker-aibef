"use server";

import prisma from "@/lib/prisma";
import { PAGINATION_DEFAULT } from "@/lib/constants";
import { formationSchema } from "@/lib/validations/formation.schema";
import { checkActionPermission, getSessionUser } from "./auth.actions";
import { createAuditLog } from "./audit.actions";
import type {
  Formation,
  FormationParticipant,
  User,
} from "@/app/generated/prisma/client";
import type { ActionResult, PaginatedResult, SearchParams } from "@/types";

// ------------------------------------------------------------------
// Types for includes
// ------------------------------------------------------------------
type ParticipantWithUser = FormationParticipant & {
  user: Pick<User, "id" | "nom" | "prenom" | "email">;
};

type FormationListItem = Formation & {
  _count: { participants: number };
};

type FormationDetail = Formation & {
  participants: ParticipantWithUser[];
};

// ------------------------------------------------------------------
// getAllFormations
// ------------------------------------------------------------------
export async function getAllFormations(
  params: SearchParams
): Promise<PaginatedResult<FormationListItem>> {
  const user = await getSessionUser();
  if (!user) throw new Error("Non authentifie");

  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? PAGINATION_DEFAULT;
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};

  // Recherche textuelle
  if (params.search) {
    where.OR = [
      { titre: { contains: params.search, mode: "insensitive" } },
      { description: { contains: params.search, mode: "insensitive" } },
      { organisme: { contains: params.search, mode: "insensitive" } },
      { lieu: { contains: params.search, mode: "insensitive" } },
    ];
  }

  // Tri
  const sortBy = params.sortBy ?? "dateDebut";
  const sortOrder = params.sortOrder ?? "desc";

  const [data, total] = await Promise.all([
    prisma.formation.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder },
      include: {
        _count: { select: { participants: true } },
      },
    }),
    prisma.formation.count({ where }),
  ]);

  return {
    data: data as FormationListItem[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ------------------------------------------------------------------
// getFormationById
// ------------------------------------------------------------------
export async function getFormationById(
  id: string
): Promise<FormationDetail | null> {
  const user = await getSessionUser();
  if (!user) throw new Error("Non authentifie");

  const formation = await prisma.formation.findUnique({
    where: { id },
    include: {
      participants: {
        include: {
          user: { select: { id: true, nom: true, prenom: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!formation) return null;

  return formation as FormationDetail;
}

// ------------------------------------------------------------------
// createFormation
// ------------------------------------------------------------------
export async function createFormation(
  data: unknown
): Promise<ActionResult<Formation>> {
  try {
    const session = await checkActionPermission([
      "SUPER_ADMIN",
      "ADMIN_SIMPLE",
      "RESPONSABLE_ANTENNE",
      "ADMIN_ANTENNE",
    ]);

    const parsed = formationSchema.parse(data);

    const formation = await prisma.formation.create({
      data: {
        titre: parsed.titre,
        description: parsed.description ?? null,
        organisme: parsed.organisme ?? null,
        lieu: parsed.lieu ?? null,
        dateDebut: parsed.dateDebut,
        dateFin: parsed.dateFin,
        cout: parsed.cout ?? null,
      },
    });

    // Log d'audit
    await createAuditLog({
      action: "CREATE",
      entite: "Formation",
      entiteId: formation.id,
      userId: session.id,
      details: JSON.stringify({
        titre: parsed.titre,
        organisme: parsed.organisme,
        dateDebut: parsed.dateDebut,
        dateFin: parsed.dateFin,
      }),
    });

    return { success: true, data: formation };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors de la creation de la formation",
    };
  }
}

// ------------------------------------------------------------------
// addParticipant
// ------------------------------------------------------------------
export async function addParticipant(
  formationId: string,
  userId: string
): Promise<ActionResult<FormationParticipant>> {
  try {
    const session = await checkActionPermission([
      "SUPER_ADMIN",
      "ADMIN_SIMPLE",
      "RESPONSABLE_ANTENNE",
      "ADMIN_ANTENNE",
    ]);

    // Verifier que la formation existe
    const formation = await prisma.formation.findUnique({
      where: { id: formationId },
      select: { id: true, titre: true },
    });
    if (!formation) {
      return { success: false, error: "Formation introuvable" };
    }

    // Verifier que l'utilisateur existe
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, nom: true, prenom: true },
    });
    if (!targetUser) {
      return { success: false, error: "Utilisateur introuvable" };
    }

    // Verifier qu'il n'est pas deja participant
    const existing = await prisma.formationParticipant.findFirst({
      where: { formationId, userId },
    });
    if (existing) {
      return { success: false, error: "Cet utilisateur est deja participant a cette formation" };
    }

    const participant = await prisma.formationParticipant.create({
      data: {
        formationId,
        userId,
      },
    });

    // Log d'audit
    await createAuditLog({
      action: "CREATE",
      entite: "FormationParticipant",
      entiteId: participant.id,
      userId: session.id,
      details: JSON.stringify({
        formationId,
        formationTitre: formation.titre,
        participantId: userId,
        participantNom: `${targetUser.prenom} ${targetUser.nom}`,
      }),
    });

    return { success: true, data: participant };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors de l'ajout du participant",
    };
  }
}

// ------------------------------------------------------------------
// removeParticipant
// ------------------------------------------------------------------
export async function removeParticipant(
  formationId: string,
  userId: string
): Promise<ActionResult<void>> {
  try {
    const session = await checkActionPermission([
      "SUPER_ADMIN",
      "ADMIN_SIMPLE",
      "RESPONSABLE_ANTENNE",
      "ADMIN_ANTENNE",
    ]);

    // Trouver le participant
    const participant = await prisma.formationParticipant.findFirst({
      where: { formationId, userId },
      include: {
        formation: { select: { titre: true } },
        user: { select: { nom: true, prenom: true } },
      },
    });
    if (!participant) {
      return { success: false, error: "Participant introuvable pour cette formation" };
    }

    await prisma.formationParticipant.delete({
      where: { id: participant.id },
    });

    // Log d'audit
    await createAuditLog({
      action: "DELETE",
      entite: "FormationParticipant",
      entiteId: participant.id,
      userId: session.id,
      details: JSON.stringify({
        formationId,
        formationTitre: participant.formation.titre,
        participantNom: `${participant.user.prenom} ${participant.user.nom}`,
      }),
    });

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors du retrait du participant",
    };
  }
}

// ------------------------------------------------------------------
// toggleAttestation
// ------------------------------------------------------------------
export async function toggleAttestation(
  formationParticipantId: string
): Promise<ActionResult<FormationParticipant>> {
  try {
    const session = await checkActionPermission([
      "SUPER_ADMIN",
      "ADMIN_SIMPLE",
      "RESPONSABLE_ANTENNE",
      "ADMIN_ANTENNE",
    ]);

    const participant = await prisma.formationParticipant.findUnique({
      where: { id: formationParticipantId },
      include: {
        formation: { select: { titre: true } },
        user: { select: { nom: true, prenom: true } },
      },
    });
    if (!participant) {
      return { success: false, error: "Participant introuvable" };
    }

    const updated = await prisma.formationParticipant.update({
      where: { id: formationParticipantId },
      data: { attestation: !participant.attestation },
    });

    // Log d'audit
    await createAuditLog({
      action: "UPDATE",
      entite: "FormationParticipant",
      entiteId: formationParticipantId,
      userId: session.id,
      details: JSON.stringify({
        formationTitre: participant.formation.titre,
        participantNom: `${participant.user.prenom} ${participant.user.nom}`,
        attestation: !participant.attestation,
      }),
    });

    return { success: true, data: updated };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors de la mise a jour de l'attestation",
    };
  }
}
