"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import type { SessionUser, ActionResult } from "@/types";
import type { Role } from "@/app/generated/prisma/client";
import { registerSchema } from "@/lib/validations/auth.schema";

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session.user as SessionUser;
}

export async function checkActionPermission(
  allowedRoles: Role[]
): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("Non authentifie");
  }
  if (!allowedRoles.includes(user.role)) {
    throw new Error("Acces non autorise");
  }
  return user;
}

export async function updateUserTheme(
  theme: string
): Promise<ActionResult> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return { success: false, error: "Non authentifie" };
    }

    const validThemes = ["light", "dark", "theme-blue", "theme-green"];
    if (!validThemes.includes(theme)) {
      return { success: false, error: "Theme invalide" };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { theme },
    });

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la mise a jour du theme",
    };
  }
}

export async function registerUser(
  data: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = registerSchema.parse(data);

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: parsed.email }, { username: parsed.username }],
      },
    });

    if (existingUser) {
      return {
        success: false,
        error: "Un utilisateur avec cet email ou nom d'utilisateur existe deja",
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

    return { success: true, data: { id: user.id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors de la creation du compte",
    };
  }
}
