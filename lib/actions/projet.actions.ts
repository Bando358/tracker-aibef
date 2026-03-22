"use server";

import prisma from "@/lib/prisma";
import { PAGINATION_DEFAULT } from "@/lib/constants";
import type { ActionResult, PaginatedResult } from "@/types";
import type { Projet } from "@/app/generated/prisma/client";
import { checkActionPermission } from "./auth.actions";
import { createAuditLog } from "./audit.actions";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
type ProjetWithCount = Projet & {
  _count: { activites: number };
  antenne: { id: string; nom: string; code: string } | null;
};

// ------------------------------------------------------------------
// GET ALL (paginated)
// ------------------------------------------------------------------
export async function getAllProjets(params: {
  search?: string;
  page?: number;
  pageSize?: number;
  activeOnly?: boolean;
  bailleur?: string;
  typeFonds?: string;
  antenneId?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}): Promise<PaginatedResult<ProjetWithCount>> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? PAGINATION_DEFAULT;
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};

  if (params.activeOnly !== false) {
    where.isActive = true;
  }

  if (params.search) {
    where.OR = [
      { nom: { contains: params.search, mode: "insensitive" } },
      { code: { contains: params.search, mode: "insensitive" } },
      { description: { contains: params.search, mode: "insensitive" } },
      { bailleur: { contains: params.search, mode: "insensitive" } },
    ];
  }

  if (params.bailleur) {
    where.bailleur = params.bailleur;
  }
  if (params.typeFonds) {
    where.typeFonds = params.typeFonds;
  }
  if (params.antenneId) {
    where.antenneId = params.antenneId;
  }

  const sortField = params.sortBy ?? "code";
  const sortOrder = params.sortOrder ?? "asc";
  const orderBy: Record<string, string> = { [sortField]: sortOrder };

  const [data, total] = await Promise.all([
    prisma.projet.findMany({
      where,
      skip,
      take: pageSize,
      orderBy,
      include: {
        _count: { select: { activites: true } },
        antenne: { select: { id: true, nom: true, code: true } },
      },
    }),
    prisma.projet.count({ where }),
  ]);

  return {
    data: data as ProjetWithCount[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getProjetFilterOptions(): Promise<{
  bailleurs: string[];
  typesFonds: string[];
}> {
  const [bailleursRaw, typeFondsRaw] = await Promise.all([
    prisma.projet.findMany({
      where: { bailleur: { not: null }, isActive: true },
      select: { bailleur: true },
      distinct: ["bailleur"],
      orderBy: { bailleur: "asc" },
    }),
    prisma.projet.findMany({
      where: { typeFonds: { not: null }, isActive: true },
      select: { typeFonds: true },
      distinct: ["typeFonds"],
      orderBy: { typeFonds: "asc" },
    }),
  ]);

  return {
    bailleurs: bailleursRaw.map((b) => b.bailleur!).filter(Boolean),
    typesFonds: typeFondsRaw.map((t) => t.typeFonds!).filter(Boolean),
  };
}

// ------------------------------------------------------------------
// GET BY ID
// ------------------------------------------------------------------
export async function getProjetById(id: string) {
  return prisma.projet.findUnique({
    where: { id },
    include: {
      antenne: { select: { id: true, nom: true, code: true } },
      activites: {
        select: {
          id: true,
          titre: true,
          statut: true,
          type: true,
          dateDebut: true,
          dateFin: true,
        },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { activites: true } },
    },
  });
}

// ------------------------------------------------------------------
// GET ALL (simple list for selects)
// ------------------------------------------------------------------
export async function getProjetsForSelect(): Promise<
  { id: string; code: string; nom: string }[]
> {
  return prisma.projet.findMany({
    where: { isActive: true },
    select: { id: true, code: true, nom: true },
    orderBy: { code: "asc" },
  });
}

// ------------------------------------------------------------------
// CREATE
// ------------------------------------------------------------------
export async function createProjet(data: {
  code: string;
  nom: string;
  description?: string;
  dateDebut: Date;
  dateFin?: Date | null;
}): Promise<ActionResult<Projet>> {
  try {
    const session = await checkActionPermission(["SUPER_ADMIN", "ADMIN_SIMPLE"]);

    const existing = await prisma.projet.findUnique({
      where: { code: data.code },
    });
    if (existing) {
      return { success: false, error: `Le code "${data.code}" est deja utilise` };
    }

    const projet = await prisma.projet.create({
      data: {
        code: data.code,
        nom: data.nom,
        description: data.description ?? null,
        dateDebut: data.dateDebut,
        dateFin: data.dateFin ?? null,
      },
    });

    await createAuditLog({
      action: "CREATE",
      entite: "Projet",
      entiteId: projet.id,
      userId: session.id,
      details: JSON.stringify({ code: data.code, nom: data.nom }),
    });

    return { success: true, data: projet };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la creation",
    };
  }
}

// ------------------------------------------------------------------
// UPDATE
// ------------------------------------------------------------------
export async function updateProjet(
  id: string,
  data: {
    code?: string;
    nom?: string;
    description?: string;
    dateDebut?: Date;
    dateFin?: Date | null;
  }
): Promise<ActionResult<Projet>> {
  try {
    const session = await checkActionPermission(["SUPER_ADMIN", "ADMIN_SIMPLE"]);

    if (data.code) {
      const existing = await prisma.projet.findFirst({
        where: { code: data.code, id: { not: id } },
      });
      if (existing) {
        return { success: false, error: `Le code "${data.code}" est deja utilise` };
      }
    }

    const projet = await prisma.projet.update({
      where: { id },
      data,
    });

    await createAuditLog({
      action: "UPDATE",
      entite: "Projet",
      entiteId: id,
      userId: session.id,
      details: JSON.stringify(data),
    });

    return { success: true, data: projet };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la modification",
    };
  }
}

// ------------------------------------------------------------------
// DELETE (soft)
// ------------------------------------------------------------------
export async function deleteProjet(id: string): Promise<ActionResult<void>> {
  try {
    const session = await checkActionPermission(["SUPER_ADMIN", "ADMIN_SIMPLE"]);

    await prisma.projet.update({
      where: { id },
      data: { isActive: false },
    });

    await createAuditLog({
      action: "DELETE",
      entite: "Projet",
      entiteId: id,
      userId: session.id,
    });

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la suppression",
    };
  }
}
