"use server";

import prisma from "@/lib/prisma";
import { getSessionUser, checkActionPermission } from "@/lib/actions/auth.actions";
import { createAuditLog } from "@/lib/actions/audit.actions";
import { encryptTemplate, decryptTemplate } from "@/lib/fingerprint/crypto";
import type { ActionResult } from "@/types";

// ======================== ENROLEMENT ========================

export async function enrollerEmpreinte(data: {
  userId: string;
  doigt: number;
  templateBase64: string;
  qualite: number;
}): Promise<ActionResult> {
  try {
    const session = await checkActionPermission([
      "SUPER_ADMIN",
      "ADMIN_SIMPLE",
      "RESPONSABLE_ANTENNE",
      "ADMIN_ANTENNE",
    ]);

    // Valider les donnees
    if (data.doigt < 1 || data.doigt > 10) {
      return { success: false, error: "Doigt invalide (1-10)" };
    }
    if (!data.templateBase64) {
      return { success: false, error: "Template manquant" };
    }
    if (data.qualite < 0 || data.qualite > 100) {
      return { success: false, error: "Qualite invalide (0-100)" };
    }

    // Verifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { id: true, antenneId: true },
    });
    if (!user) {
      return { success: false, error: "Utilisateur introuvable" };
    }

    // Un responsable ne peut enroler que les employes de son antenne
    if (
      (session.role === "RESPONSABLE_ANTENNE" || session.role === "ADMIN_ANTENNE") &&
      user.antenneId !== session.antenneId
    ) {
      return { success: false, error: "Acces non autorise a cet employe" };
    }

    // Chiffrer le template
    const encrypted = encryptTemplate(data.templateBase64);

    // Upsert : creer ou remplacer l'empreinte pour ce doigt
    await prisma.empreinte.upsert({
      where: { userId_doigt: { userId: data.userId, doigt: data.doigt } },
      create: {
        templateData: encrypted,
        doigt: data.doigt,
        qualite: data.qualite,
        user: { connect: { id: data.userId } },
        enrolledBy: { connect: { id: session.id } },
      },
      update: {
        templateData: encrypted,
        qualite: data.qualite,
        actif: true,
        enrolledBy: { connect: { id: session.id } },
      },
    });

    // Marquer l'utilisateur comme enrole
    await prisma.user.update({
      where: { id: data.userId },
      data: { empreinteEnrolee: true },
    });

    // Log biometrique
    await prisma.empreinteLog.create({
      data: {
        evenement: "ENROLLMENT",
        score: data.qualite,
        details: `Doigt ${data.doigt} enrole`,
        user: { connect: { id: data.userId } },
        admin: { connect: { id: session.id } },
      },
    });

    await createAuditLog({
      action: "CREATE",
      entite: "Empreinte",
      entiteId: data.userId,
      userId: session.id,
      details: `Enrolement empreinte doigt ${data.doigt} pour utilisateur ${data.userId}`,
    });

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors de l'enrolement",
    };
  }
}

// ======================== SUPPRESSION ========================

export async function supprimerEmpreinte(
  empreinteId: string
): Promise<ActionResult> {
  try {
    const session = await checkActionPermission([
      "SUPER_ADMIN",
      "ADMIN_SIMPLE",
      "RESPONSABLE_ANTENNE",
      "ADMIN_ANTENNE",
    ]);

    const empreinte = await prisma.empreinte.findUnique({
      where: { id: empreinteId },
      select: { id: true, userId: true, doigt: true },
    });

    if (!empreinte) {
      return { success: false, error: "Empreinte introuvable" };
    }

    await prisma.empreinte.delete({ where: { id: empreinteId } });

    // Verifier s'il reste des empreintes actives
    const remaining = await prisma.empreinte.count({
      where: { userId: empreinte.userId, actif: true },
    });

    if (remaining === 0) {
      await prisma.user.update({
        where: { id: empreinte.userId },
        data: { empreinteEnrolee: false },
      });
    }

    await prisma.empreinteLog.create({
      data: {
        evenement: "TEMPLATE_DELETED",
        details: `Doigt ${empreinte.doigt} supprime`,
        user: { connect: { id: empreinte.userId } },
        admin: { connect: { id: session.id } },
      },
    });

    await createAuditLog({
      action: "DELETE",
      entite: "Empreinte",
      entiteId: empreinteId,
      userId: session.id,
      details: `Suppression empreinte doigt ${empreinte.doigt} de ${empreinte.userId}`,
    });

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors de la suppression",
    };
  }
}

// ======================== LECTURE ========================

export async function getEmpreintesUtilisateur(userId: string) {
  const session = await getSessionUser();
  if (!session) throw new Error("Non authentifie");

  const empreintes = await prisma.empreinte.findMany({
    where: { userId, actif: true },
    select: {
      id: true,
      doigt: true,
      qualite: true,
      actif: true,
      createdAt: true,
      enrolledBy: { select: { nom: true, prenom: true } },
    },
    orderBy: { doigt: "asc" },
  });

  return empreintes;
}

export async function getUtilisateursAvecEmpreintes(antenneId?: string) {
  const session = await checkActionPermission([
    "SUPER_ADMIN",
    "RESPONSABLE_ANTENNE",
  ]);

  const where: Record<string, unknown> = { isActive: true };

  if (session.role === "RESPONSABLE_ANTENNE" || session.role === "ADMIN_ANTENNE") {
    where.antenneId = session.antenneId;
  } else if (antenneId) {
    where.antenneId = antenneId;
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      nom: true,
      prenom: true,
      email: true,
      role: true,
      empreinteEnrolee: true,
      antenne: { select: { nom: true } },
      _count: { select: { empreintes: true } },
    },
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
  });

  return users;
}

// ======================== IDENTIFICATION (serveur) ========================

/**
 * Recupere tous les templates dechiffres pour l'identification 1:N.
 * Utilise par l'API route /api/fingerprint/identify.
 */
export async function getTemplatesPourIdentification(antenneId?: string | null) {
  const where: Record<string, unknown> = { actif: true };

  if (antenneId) {
    where.user = { antenneId, isActive: true };
  } else {
    where.user = { isActive: true };
  }

  const empreintes = await prisma.empreinte.findMany({
    where,
    select: {
      templateData: true,
      doigt: true,
      userId: true,
      user: { select: { nom: true, prenom: true } },
    },
  });

  return empreintes.map((e) => ({
    userId: e.userId,
    nom: e.user.nom,
    prenom: e.user.prenom,
    doigt: e.doigt,
    templateBase64: decryptTemplate(e.templateData),
  }));
}
