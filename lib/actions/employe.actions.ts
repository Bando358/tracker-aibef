"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";
import { PAGINATION_DEFAULT } from "@/lib/constants";
import { checkActionPermission, getSessionUser } from "./auth.actions";
import { createAuditLog } from "./audit.actions";
import {
  employeSchema,
  employeUpdateSchema,
} from "@/lib/validations/employe.schema";
import type { SearchParams, PaginatedResult, ActionResult } from "@/types";
import type { User, Antenne, Prisma } from "@/app/generated/prisma/client";

export type UserWithAntenne = User & { antenne: Antenne | null };

export async function getAllEmployes(
  params: SearchParams,
  antenneId?: string
): Promise<PaginatedResult<UserWithAntenne>> {
  const session = await getSessionUser();
  if (!session) throw new Error("Non authentifie");

  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? PAGINATION_DEFAULT;
  const skip = (page - 1) * pageSize;

  const where: Prisma.UserWhereInput = {};

  // Role-scoped filtering
  if (session.role === "RESPONSABLE_ANTENNE") {
    where.antenneId = session.antenneId;
  } else if (antenneId) {
    where.antenneId = antenneId;
  }

  if (params.search) {
    where.OR = [
      { nom: { contains: params.search, mode: "insensitive" } },
      { prenom: { contains: params.search, mode: "insensitive" } },
      { email: { contains: params.search, mode: "insensitive" } },
      { username: { contains: params.search, mode: "insensitive" } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: params.sortBy
        ? { [params.sortBy]: params.sortOrder ?? "asc" }
        : { nom: "asc" },
      include: { antenne: true },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data: data as UserWithAntenne[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getEmployeById(
  id: string
): Promise<UserWithAntenne | null> {
  const session = await getSessionUser();
  if (!session) throw new Error("Non authentifie");

  const user = await prisma.user.findUnique({
    where: { id },
    include: { antenne: true },
  });

  // RESPONSABLE_ANTENNE can only see users from their own antenne
  if (
    session.role === "RESPONSABLE_ANTENNE" &&
    user?.antenneId !== session.antenneId
  ) {
    throw new Error("Acces non autorise");
  }

  return user as UserWithAntenne | null;
}

export async function createEmploye(
  data: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await checkActionPermission([
      "SUPER_ADMIN",
      "RESPONSABLE_ANTENNE",
    ]);

    const parsed = employeSchema.parse(data);

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: parsed.email }, { username: parsed.username }],
      },
    });

    if (existingUser) {
      return {
        success: false,
        error:
          "Un utilisateur avec cet email ou nom d'utilisateur existe deja",
      };
    }

    const hashedPassword = await bcrypt.hash(parsed.password, 10);

    const user = await prisma.user.create({
      data: {
        nom: parsed.nom,
        prenom: parsed.prenom,
        email: parsed.email,
        username: parsed.username,
        password: hashedPassword,
        role: parsed.role,
        antenne: parsed.antenneId ? { connect: { id: parsed.antenneId } } : undefined,
        typeJournee: parsed.typeJournee,
        telephone: parsed.telephone ?? null,
      },
    });

    await createAuditLog({
      action: "CREATE",
      entite: "User",
      entiteId: user.id,
      userId: session.id,
      details: JSON.stringify({
        nom: parsed.nom,
        prenom: parsed.prenom,
        email: parsed.email,
        username: parsed.username,
        role: parsed.role,
      }),
    });

    return { success: true, data: { id: user.id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors de la creation de l'employe",
    };
  }
}

export async function updateEmploye(
  id: string,
  data: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await checkActionPermission([
      "SUPER_ADMIN",
      "RESPONSABLE_ANTENNE",
    ]);

    const parsed = employeUpdateSchema.parse(data);

    // Check uniqueness for email/username excluding current user
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: parsed.email }, { username: parsed.username }],
        NOT: { id },
      },
    });

    if (existingUser) {
      return {
        success: false,
        error:
          "Un autre utilisateur avec cet email ou nom d'utilisateur existe deja",
      };
    }

    const updateData: Prisma.UserUpdateInput = {
      nom: parsed.nom,
      prenom: parsed.prenom,
      email: parsed.email,
      username: parsed.username,
      role: parsed.role,
      typeJournee: parsed.typeJournee,
      telephone: parsed.telephone ?? null,
      antenne: parsed.antenneId
        ? { connect: { id: parsed.antenneId } }
        : { disconnect: true },
    };

    // Only update password if provided and non-empty
    if (parsed.password && parsed.password.length >= 6) {
      updateData.password = await bcrypt.hash(parsed.password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    await createAuditLog({
      action: "UPDATE",
      entite: "User",
      entiteId: id,
      userId: session.id,
      details: JSON.stringify({
        nom: parsed.nom,
        prenom: parsed.prenom,
        email: parsed.email,
        username: parsed.username,
        role: parsed.role,
      }),
    });

    return { success: true, data: { id: user.id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors de la modification de l'employe",
    };
  }
}

export async function deactivateEmploye(
  id: string
): Promise<ActionResult<void>> {
  try {
    const session = await checkActionPermission([
      "SUPER_ADMIN",
      "RESPONSABLE_ANTENNE",
    ]);

    // Prevent deactivating self
    if (session.id === id) {
      return {
        success: false,
        error: "Vous ne pouvez pas desactiver votre propre compte",
      };
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    await createAuditLog({
      action: "DELETE",
      entite: "User",
      entiteId: id,
      userId: session.id,
      details: "Desactivation du compte employe",
    });

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors de la desactivation de l'employe",
    };
  }
}

export async function getEmployesByAntenne(
  antenneId: string
): Promise<Pick<User, "id" | "nom" | "prenom" | "role">[]> {
  return prisma.user.findMany({
    where: { antenneId, isActive: true },
    select: { id: true, nom: true, prenom: true, role: true },
    orderBy: { nom: "asc" },
  });
}
