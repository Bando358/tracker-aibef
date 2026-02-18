"use server";

import prisma from "@/lib/prisma";
import { PAGINATION_DEFAULT } from "@/lib/constants";
import type { ActionResult, PaginatedResult } from "@/types";
import type { Antenne } from "@/app/generated/prisma/client";
import { checkActionPermission } from "./auth.actions";
import { createAuditLog } from "./audit.actions";

export async function getAllAntennes(params: {
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResult<Antenne & { _count: { employes: number; activiteAntennes: number } }>> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? PAGINATION_DEFAULT;
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = { isActive: true };

  if (params.search) {
    where.OR = [
      { nom: { contains: params.search, mode: "insensitive" } },
      { code: { contains: params.search, mode: "insensitive" } },
      { region: { contains: params.search, mode: "insensitive" } },
      { ville: { contains: params.search, mode: "insensitive" } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.antenne.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { nom: "asc" },
      include: {
        _count: { select: { employes: true, activiteAntennes: true } },
      },
    }),
    prisma.antenne.count({ where }),
  ]);

  return {
    data: data as (Antenne & { _count: { employes: number; activiteAntennes: number } })[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getAntenneById(id: string) {
  return prisma.antenne.findUnique({
    where: { id },
    include: {
      employes: { where: { isActive: true }, select: { id: true, nom: true, prenom: true, role: true, email: true } },
      _count: { select: { employes: true, activiteAntennes: true, recommandations: true } },
    },
  });
}

export async function createAntenne(
  data: {
    nom: string;
    code: string;
    region: string;
    ville: string;
    adresse?: string;
    telephone?: string;
    email?: string;
  }
): Promise<ActionResult<Antenne>> {
  try {
    const session = await checkActionPermission(["SUPER_ADMIN"]);

    const antenne = await prisma.antenne.create({
      data: {
        nom: data.nom,
        code: data.code,
        region: data.region,
        ville: data.ville,
        adresse: data.adresse ?? null,
        telephone: data.telephone ?? null,
        email: data.email ?? null,
      },
    });

    await createAuditLog({
      action: "CREATE",
      entite: "Antenne",
      entiteId: antenne.id,
      userId: session.id,
      details: JSON.stringify(data),
    });

    return { success: true, data: antenne };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la creation",
    };
  }
}

export async function updateAntenne(
  id: string,
  data: {
    nom?: string;
    code?: string;
    region?: string;
    ville?: string;
    adresse?: string;
    telephone?: string;
    email?: string;
  }
): Promise<ActionResult<Antenne>> {
  try {
    const session = await checkActionPermission(["SUPER_ADMIN"]);

    const antenne = await prisma.antenne.update({
      where: { id },
      data,
    });

    await createAuditLog({
      action: "UPDATE",
      entite: "Antenne",
      entiteId: id,
      userId: session.id,
      details: JSON.stringify(data),
    });

    return { success: true, data: antenne };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la modification",
    };
  }
}

export async function deleteAntenne(id: string): Promise<ActionResult<void>> {
  try {
    const session = await checkActionPermission(["SUPER_ADMIN"]);

    await prisma.antenne.update({
      where: { id },
      data: { isActive: false },
    });

    await createAuditLog({
      action: "DELETE",
      entite: "Antenne",
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
