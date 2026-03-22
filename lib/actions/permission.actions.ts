"use server";

import prisma from "@/lib/prisma";
import { checkActionPermission, getSessionUser } from "./auth.actions";
import { createAuditLog } from "./audit.actions";
import { DEFAULT_PERMISSIONS } from "@/lib/constants";
import type { ActionResult } from "@/types";

/**
 * Retourne les permissions effectives d'un utilisateur :
 * = permissions par defaut du role + permissions supplementaires individuelles
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      permissions: { select: { permission: true } },
    },
  });

  if (!user) return [];

  const rolePerms = DEFAULT_PERMISSIONS[user.role] ?? [];
  const extraPerms = user.permissions.map((p) => p.permission);

  // Fusionner sans doublons
  return [...new Set([...rolePerms, ...extraPerms])];
}

/**
 * Verifie si l'utilisateur courant a une permission donnee
 */
export async function hasPermission(permission: string): Promise<boolean> {
  const session = await getSessionUser();
  if (!session) return false;

  // SUPER_ADMIN a tout
  if (session.role === "SUPER_ADMIN") return true;

  const perms = await getUserPermissions(session.id);
  return perms.includes(permission);
}

/**
 * Retourne les permissions supplementaires (au-dela du role) d'un utilisateur
 */
export async function getExtraPermissions(userId: string): Promise<string[]> {
  const perms = await prisma.userPermission.findMany({
    where: { userId },
    select: { permission: true },
  });
  return perms.map((p) => p.permission);
}

/**
 * Accorde une permission supplementaire a un utilisateur
 */
export async function grantPermission(
  userId: string,
  permission: string
): Promise<ActionResult<void>> {
  try {
    const session = await checkActionPermission([
      "SUPER_ADMIN",
      "ADMIN_SIMPLE",
      "RESPONSABLE_ANTENNE",
      "ADMIN_ANTENNE",
    ]);

    // Verifier si deja presente
    const existing = await prisma.userPermission.findUnique({
      where: { userId_permission: { userId, permission } },
    });
    if (existing) {
      return { success: false, error: "Permission deja accordee" };
    }

    await prisma.userPermission.create({
      data: { userId, permission },
    });

    await createAuditLog({
      action: "CREATE",
      entite: "UserPermission",
      entiteId: userId,
      userId: session.id,
      details: JSON.stringify({ permission, action: "grant" }),
    });

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur",
    };
  }
}

/**
 * Retire une permission supplementaire a un utilisateur
 */
export async function revokePermission(
  userId: string,
  permission: string
): Promise<ActionResult<void>> {
  try {
    const session = await checkActionPermission([
      "SUPER_ADMIN",
      "ADMIN_SIMPLE",
      "RESPONSABLE_ANTENNE",
      "ADMIN_ANTENNE",
    ]);

    const existing = await prisma.userPermission.findUnique({
      where: { userId_permission: { userId, permission } },
    });
    if (!existing) {
      return { success: false, error: "Permission non trouvee" };
    }

    await prisma.userPermission.delete({
      where: { userId_permission: { userId, permission } },
    });

    await createAuditLog({
      action: "DELETE",
      entite: "UserPermission",
      entiteId: userId,
      userId: session.id,
      details: JSON.stringify({ permission, action: "revoke" }),
    });

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur",
    };
  }
}

/**
 * Met a jour toutes les permissions supplementaires d'un utilisateur d'un coup
 */
export async function updateUserPermissions(
  userId: string,
  permissions: string[]
): Promise<ActionResult<void>> {
  try {
    const session = await checkActionPermission([
      "SUPER_ADMIN",
      "ADMIN_SIMPLE",
      "RESPONSABLE_ANTENNE",
      "ADMIN_ANTENNE",
    ]);

    // Obtenir les permissions du role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user) return { success: false, error: "Utilisateur introuvable" };

    const rolePerms = DEFAULT_PERMISSIONS[user.role] ?? [];

    // Les permissions supplementaires = celles demandees qui ne sont pas dans le role
    const extraPerms = permissions.filter((p) => !rolePerms.includes(p));

    // Supprimer toutes les permissions existantes et recreer
    await prisma.$transaction([
      prisma.userPermission.deleteMany({ where: { userId } }),
      ...extraPerms.map((permission) =>
        prisma.userPermission.create({ data: { userId, permission } })
      ),
    ]);

    await createAuditLog({
      action: "UPDATE",
      entite: "UserPermission",
      entiteId: userId,
      userId: session.id,
      details: JSON.stringify({ extraPermissions: extraPerms }),
    });

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur",
    };
  }
}
