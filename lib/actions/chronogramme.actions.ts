"use server";

import prisma from "@/lib/prisma";
import { getSessionUser } from "./auth.actions";

export interface ChronogrammeActivite {
  id: string;
  titre: string;
  statut: string;
  projetCode: string | null;
  projetNom: string | null;
  periodes: {
    antenne: string;
    dateDebut: Date;
    dateFin: Date;
    statut: string;
  }[];
}

export async function fetchChronogrammeData(
  annee: number,
  antenneId?: string,
  projetId?: string
): Promise<ChronogrammeActivite[]> {
  const session = await getSessionUser();
  if (!session) throw new Error("Non authentifie");

  // Scope par role
  let scopedAntenneId = antenneId;
  if (
    (session.role === "RESPONSABLE_ANTENNE" || session.role === "ADMIN_ANTENNE") &&
    session.antenneId
  ) {
    scopedAntenneId = session.antenneId;
  }

  const startOfYear = new Date(annee, 0, 1);
  const endOfYear = new Date(annee, 11, 31);

  const where: Record<string, unknown> = {};
  if (projetId) where.projetId = projetId;
  if (scopedAntenneId) {
    where.activiteAntennes = { some: { antenneId: scopedAntenneId } };
  }

  const activites = await prisma.activite.findMany({
    where,
    include: {
      projet: { select: { code: true, nom: true } },
      activiteAntennes: {
        include: {
          antenne: { select: { nom: true } },
          periodes: {
            where: {
              OR: [
                { dateDebut: { gte: startOfYear, lte: endOfYear } },
                { dateFin: { gte: startOfYear, lte: endOfYear } },
              ],
            },
            orderBy: { dateDebut: "asc" },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return activites
    .filter((a) => a.activiteAntennes.some((aa) => aa.periodes.length > 0))
    .map((a) => ({
      id: a.id,
      titre: a.titre,
      statut: a.statut,
      projetCode: a.projet?.code ?? null,
      projetNom: a.projet?.nom ?? null,
      periodes: a.activiteAntennes.flatMap((aa) =>
        aa.periodes.map((p) => ({
          antenne: aa.antenne.nom,
          dateDebut: p.dateDebut,
          dateFin: p.dateFin,
          statut: p.statut,
        }))
      ),
    }));
}
