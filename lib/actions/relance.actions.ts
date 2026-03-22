"use server";

import prisma from "@/lib/prisma";
import { createNotification } from "./notification.actions";

/**
 * Detecte et envoie des relances pour :
 * - Activites dont une periode approche de l'echeance (J-7, J-3, J-1)
 * - Recommandations proches de l'echeance
 * - Conges en attente d'approbation depuis plus de 3 jours
 */
export async function executeRelances(): Promise<{
  activiteRelances: number;
  recommandationRelances: number;
  congeRelances: number;
}> {
  const now = new Date();
  const j1 = new Date(now); j1.setDate(j1.getDate() + 1);
  const j3 = new Date(now); j3.setDate(j3.getDate() + 3);
  const j7 = new Date(now); j7.setDate(j7.getDate() + 7);

  let activiteRelances = 0;
  let recommandationRelances = 0;
  let congeRelances = 0;

  // --- Relances activites (periodes proches de l'echeance) ---
  const periodes = await prisma.activiteAntennePeriode.findMany({
    where: {
      statut: { in: ["PLANIFIEE", "EN_COURS"] },
      dateFin: { gte: now, lte: j7 },
    },
    include: {
      activiteAntenne: {
        include: {
          activite: { select: { id: true, titre: true } },
          responsable: { select: { id: true } },
          antenne: { select: { nom: true } },
        },
      },
    },
  });

  for (const p of periodes) {
    const resp = p.activiteAntenne.responsable;
    if (!resp) continue;

    const daysLeft = Math.ceil((p.dateFin.getTime() - now.getTime()) / 86400000);
    let urgence = "";
    if (daysLeft <= 1) urgence = "DEMAIN";
    else if (daysLeft <= 3) urgence = `dans ${daysLeft} jours`;
    else urgence = `dans ${daysLeft} jours`;

    await createNotification({
      type: "ACTIVITE_EN_RETARD",
      titre: `Rappel : echeance ${urgence}`,
      message: `L'activite "${p.activiteAntenne.activite.titre}" (${p.activiteAntenne.antenne.nom}) arrive a echeance ${urgence}.`,
      userId: resp.id,
      lien: `/activites/${p.activiteAntenne.activite.id}`,
    });
    activiteRelances++;
  }

  // --- Relances recommandations (echeance J-7) ---
  const recommandations = await prisma.recommandation.findMany({
    where: {
      statut: { in: ["EN_ATTENTE", "EN_COURS"] },
      dateEcheance: { gte: now, lte: j7 },
    },
    include: {
      responsables: {
        include: { user: { select: { id: true } } },
      },
    },
  });

  for (const r of recommandations) {
    const daysLeft = Math.ceil((r.dateEcheance.getTime() - now.getTime()) / 86400000);
    for (const resp of r.responsables) {
      await createNotification({
        type: "RECOMMANDATION_EN_RETARD",
        titre: `Rappel : recommandation - echeance dans ${daysLeft}j`,
        message: `La recommandation "${r.titre}" arrive a echeance dans ${daysLeft} jour(s).`,
        userId: resp.user.id,
        lien: `/recommandations/${r.id}`,
      });
      recommandationRelances++;
    }
  }

  // --- Relances conges en attente > 3 jours ---
  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const congesEnAttente = await prisma.conge.findMany({
    where: {
      statut: "SOUMIS",
      updatedAt: { lte: threeDaysAgo },
    },
    include: {
      employe: {
        select: { nom: true, prenom: true, antenneId: true },
      },
    },
  });

  for (const c of congesEnAttente) {
    // Notifier le responsable d'antenne
    if (c.employe.antenneId) {
      const responsables = await prisma.user.findMany({
        where: {
          antenneId: c.employe.antenneId,
          role: { in: ["RESPONSABLE_ANTENNE", "ADMIN_ANTENNE"] },
          isActive: true,
        },
        select: { id: true },
      });
      for (const resp of responsables) {
        await createNotification({
          type: "CONGE_SOUMIS",
          titre: "Rappel : conge en attente",
          message: `La demande de conge de ${c.employe.prenom} ${c.employe.nom} est en attente depuis plus de 3 jours.`,
          userId: resp.id,
          lien: `/conges/${c.id}`,
        });
        congeRelances++;
      }
    }
  }

  return { activiteRelances, recommandationRelances, congeRelances };
}
