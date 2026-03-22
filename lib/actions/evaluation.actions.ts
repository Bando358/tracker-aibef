"use server";

import prisma from "@/lib/prisma";
import { PAGINATION_DEFAULT } from "@/lib/constants";
import { evaluationSchema } from "@/lib/validations/evaluation.schema";
import { checkActionPermission, getSessionUser } from "./auth.actions";
import { createAuditLog } from "./audit.actions";
import type {
  EvaluationPerformance,
  StatutEvaluation,
  User,
} from "@/app/generated/prisma/client";
import type { ActionResult, PaginatedResult, SearchParams } from "@/types";

// ------------------------------------------------------------------
// Types for includes
// ------------------------------------------------------------------
type EvaluationListItem = EvaluationPerformance & {
  employe: Pick<User, "id" | "nom" | "prenom" | "email">;
  evaluateur: Pick<User, "id" | "nom" | "prenom" | "email">;
};

type EvaluationDetail = EvaluationPerformance & {
  employe: Pick<User, "id" | "nom" | "prenom" | "email">;
  evaluateur: Pick<User, "id" | "nom" | "prenom" | "email">;
};

// ------------------------------------------------------------------
// getAllEvaluations
// ------------------------------------------------------------------
export async function getAllEvaluations(
  params: SearchParams & { statut?: StatutEvaluation },
  antenneId?: string
): Promise<PaginatedResult<EvaluationListItem>> {
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
      { periode: { contains: params.search, mode: "insensitive" } },
      { commentaire: { contains: params.search, mode: "insensitive" } },
      { employe: { nom: { contains: params.search, mode: "insensitive" } } },
      { employe: { prenom: { contains: params.search, mode: "insensitive" } } },
    ];
  }

  // Scope par role : certains roles ne voient que les evaluations de leur antenne
  const ROLES_SCOPED_PAR_ANTENNE = [
    "RESPONSABLE_ANTENNE",
    "ADMIN_ANTENNE",
    "VOLONTAIRE",
    "MAJ",
    "PERSONNEL",
  ];
  if (ROLES_SCOPED_PAR_ANTENNE.includes(user.role) && user.antenneId) {
    where.employe = {
      ...(typeof where.employe === "object" && where.employe !== null
        ? where.employe
        : {}),
      antenneId: user.antenneId,
    };
  } else if (antenneId) {
    where.employe = {
      ...(typeof where.employe === "object" && where.employe !== null
        ? where.employe
        : {}),
      antenneId,
    };
  }

  // Tri
  const sortBy = params.sortBy ?? "createdAt";
  const sortOrder = params.sortOrder ?? "desc";

  const [data, total] = await Promise.all([
    prisma.evaluationPerformance.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder },
      include: {
        employe: { select: { id: true, nom: true, prenom: true, email: true } },
        evaluateur: { select: { id: true, nom: true, prenom: true, email: true } },
      },
    }),
    prisma.evaluationPerformance.count({ where }),
  ]);

  return {
    data: data as EvaluationListItem[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ------------------------------------------------------------------
// getEvaluationById
// ------------------------------------------------------------------
export async function getEvaluationById(
  id: string
): Promise<EvaluationDetail | null> {
  const user = await getSessionUser();
  if (!user) throw new Error("Non authentifie");

  const evaluation = await prisma.evaluationPerformance.findUnique({
    where: { id },
    include: {
      employe: { select: { id: true, nom: true, prenom: true, email: true } },
      evaluateur: { select: { id: true, nom: true, prenom: true, email: true } },
    },
  });

  if (!evaluation) return null;

  // Scope : certains roles ne peuvent voir que les evaluations de leur antenne
  const ROLES_SCOPED = [
    "RESPONSABLE_ANTENNE",
    "ADMIN_ANTENNE",
    "VOLONTAIRE",
    "MAJ",
    "PERSONNEL",
  ];
  if (ROLES_SCOPED.includes(user.role) && user.antenneId) {
    // Verifier que l'employe est dans la meme antenne
    const employe = await prisma.user.findUnique({
      where: { id: evaluation.employeId },
      select: { antenneId: true },
    });
    if (employe?.antenneId !== user.antenneId) {
      throw new Error("Acces non autorise");
    }
  }

  return evaluation as EvaluationDetail;
}

// ------------------------------------------------------------------
// createEvaluation
// ------------------------------------------------------------------
export async function createEvaluation(
  data: unknown
): Promise<ActionResult<EvaluationPerformance>> {
  try {
    const session = await checkActionPermission([
      "SUPER_ADMIN",
      "ADMIN_SIMPLE",
      "RESPONSABLE_ANTENNE",
      "ADMIN_ANTENNE",
    ]);

    const parsed = evaluationSchema.parse(data);

    const evaluation = await prisma.evaluationPerformance.create({
      data: {
        periode: parsed.periode,
        dateEval: parsed.dateEval,
        noteGlobale: parsed.noteGlobale ?? null,
        commentaire: parsed.commentaire ?? null,
        objectifs: parsed.objectifs ?? null,
        pointsForts: parsed.pointsForts ?? null,
        axesProgres: parsed.axesProgres ?? null,
        employe: { connect: { id: parsed.employeId } },
        evaluateur: { connect: { id: session.id } },
      },
    });

    // Log d'audit
    await createAuditLog({
      action: "CREATE",
      entite: "EvaluationPerformance",
      entiteId: evaluation.id,
      userId: session.id,
      details: JSON.stringify({
        periode: parsed.periode,
        employeId: parsed.employeId,
        dateEval: parsed.dateEval,
      }),
    });

    return { success: true, data: evaluation };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors de la creation de l'evaluation",
    };
  }
}

// ------------------------------------------------------------------
// updateEvaluation
// ------------------------------------------------------------------
export async function updateEvaluation(
  id: string,
  data: unknown
): Promise<ActionResult<EvaluationPerformance>> {
  try {
    const session = await checkActionPermission([
      "SUPER_ADMIN",
      "ADMIN_SIMPLE",
      "RESPONSABLE_ANTENNE",
      "ADMIN_ANTENNE",
    ]);

    const parsed = evaluationSchema.parse(data);

    const existing = await prisma.evaluationPerformance.findUnique({
      where: { id },
      select: { statut: true },
    });

    if (!existing) {
      return { success: false, error: "Evaluation introuvable" };
    }

    if (existing.statut === "VALIDEE") {
      return {
        success: false,
        error: "Impossible de modifier une evaluation validee",
      };
    }

    const evaluation = await prisma.evaluationPerformance.update({
      where: { id },
      data: {
        periode: parsed.periode,
        dateEval: parsed.dateEval,
        noteGlobale: parsed.noteGlobale ?? null,
        commentaire: parsed.commentaire ?? null,
        objectifs: parsed.objectifs ?? null,
        pointsForts: parsed.pointsForts ?? null,
        axesProgres: parsed.axesProgres ?? null,
      },
    });

    // Log d'audit
    await createAuditLog({
      action: "UPDATE",
      entite: "EvaluationPerformance",
      entiteId: id,
      userId: session.id,
      details: JSON.stringify({
        periode: parsed.periode,
        employeId: parsed.employeId,
      }),
    });

    return { success: true, data: evaluation };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors de la mise a jour de l'evaluation",
    };
  }
}

// ------------------------------------------------------------------
// submitEvaluation
// ------------------------------------------------------------------
export async function submitEvaluation(
  id: string
): Promise<ActionResult<EvaluationPerformance>> {
  try {
    const session = await checkActionPermission([
      "SUPER_ADMIN",
      "ADMIN_SIMPLE",
      "RESPONSABLE_ANTENNE",
      "ADMIN_ANTENNE",
    ]);

    const existing = await prisma.evaluationPerformance.findUnique({
      where: { id },
      select: { statut: true, periode: true },
    });

    if (!existing) {
      return { success: false, error: "Evaluation introuvable" };
    }

    if (existing.statut !== "BROUILLON") {
      return {
        success: false,
        error: "Seule une evaluation en brouillon peut etre soumise",
      };
    }

    const evaluation = await prisma.evaluationPerformance.update({
      where: { id },
      data: { statut: "SOUMISE" },
    });

    // Log d'audit
    await createAuditLog({
      action: "STATUS_CHANGE",
      entite: "EvaluationPerformance",
      entiteId: id,
      userId: session.id,
      details: JSON.stringify({
        ancienStatut: "BROUILLON",
        nouveauStatut: "SOUMISE",
        periode: existing.periode,
      }),
    });

    return { success: true, data: evaluation };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors de la soumission de l'evaluation",
    };
  }
}

// ------------------------------------------------------------------
// validateEvaluation
// ------------------------------------------------------------------
export async function validateEvaluation(
  id: string
): Promise<ActionResult<EvaluationPerformance>> {
  try {
    const session = await checkActionPermission([
      "SUPER_ADMIN",
      "ADMIN_SIMPLE",
    ]);

    const existing = await prisma.evaluationPerformance.findUnique({
      where: { id },
      select: { statut: true, periode: true },
    });

    if (!existing) {
      return { success: false, error: "Evaluation introuvable" };
    }

    if (existing.statut !== "SOUMISE") {
      return {
        success: false,
        error: "Seule une evaluation soumise peut etre validee",
      };
    }

    const evaluation = await prisma.evaluationPerformance.update({
      where: { id },
      data: { statut: "VALIDEE" },
    });

    // Log d'audit
    await createAuditLog({
      action: "STATUS_CHANGE",
      entite: "EvaluationPerformance",
      entiteId: id,
      userId: session.id,
      details: JSON.stringify({
        ancienStatut: "SOUMISE",
        nouveauStatut: "VALIDEE",
        periode: existing.periode,
      }),
    });

    return { success: true, data: evaluation };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors de la validation de l'evaluation",
    };
  }
}
