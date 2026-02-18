import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import bcrypt from "bcrypt";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not defined");
const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Nettoyage de la base de donnees...");
  // Suppression dans l'ordre inverse des dependances
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.conge.deleteMany();
  await prisma.pointage.deleteMany();
  await prisma.recommandationHistorique.deleteMany();
  await prisma.recommandationResponsable.deleteMany();
  await prisma.recommandation.deleteMany();
  await prisma.activiteHistorique.deleteMany();
  await prisma.activiteAntenne.deleteMany();
  await prisma.activite.deleteMany();
  await prisma.projet.deleteMany();
  await prisma.user.deleteMany();
  await prisma.antenne.deleteMany();

  console.log("Creation des antennes...");

  // ======================== ANTENNES ========================

  const antenneAbidjan = await prisma.antenne.create({
    data: {
      nom: "Antenne Abidjan",
      code: "ABJ-01",
      region: "Lagunes",
      ville: "Abidjan",
      adresse: "Boulevard de Marseille, Marcory",
      telephone: "+225 27 21 35 00 00",
      email: "abidjan@aibef.ci",
      isActive: true,
    },
  });

  const antenneBouake = await prisma.antenne.create({
    data: {
      nom: "Antenne Bouake",
      code: "BKE-01",
      region: "Vallee du Bandama",
      ville: "Bouake",
      adresse: "Quartier Commerce, Bouake",
      telephone: "+225 27 31 63 00 00",
      email: "bouake@aibef.ci",
      isActive: true,
    },
  });

  const antenneSanPedro = await prisma.antenne.create({
    data: {
      nom: "Antenne San Pedro",
      code: "SPD-01",
      region: "Bas-Sassandra",
      ville: "San Pedro",
      adresse: "Centre-ville, San Pedro",
      telephone: "+225 27 34 71 00 00",
      email: "sanpedro@aibef.ci",
      isActive: true,
    },
  });

  console.log("Creation des utilisateurs...");

  // ======================== USERS ========================

  const hashedAdmin = await bcrypt.hash("admin123", 10);
  const hashedPass = await bcrypt.hash("pass123", 10);

  // SUPER_ADMIN
  const superAdmin = await prisma.user.create({
    data: {
      nom: "Administrateur",
      prenom: "Super",
      email: "admin@aibef.ci",
      username: "admin",
      password: hashedAdmin,
      role: "SUPER_ADMIN",
      telephone: "+225 07 00 00 00 00",
      typeJournee: "FIXE",
      isActive: true,
    },
  });

  // RESPONSABLE_ANTENNE (3)
  const respAbidjan = await prisma.user.create({
    data: {
      nom: "Kouame",
      prenom: "Akou",
      email: "resp.abidjan@aibef.ci",
      username: "resp.abidjan",
      password: hashedPass,
      role: "RESPONSABLE_ANTENNE",
      telephone: "+225 07 01 00 00 01",
      antenneId: antenneAbidjan.id,
      typeJournee: "FIXE",
      isActive: true,
    },
  });

  const respBouake = await prisma.user.create({
    data: {
      nom: "Traore",
      prenom: "Mamadou",
      email: "resp.bouake@aibef.ci",
      username: "resp.bouake",
      password: hashedPass,
      role: "RESPONSABLE_ANTENNE",
      telephone: "+225 07 01 00 00 02",
      antenneId: antenneBouake.id,
      typeJournee: "FIXE",
      isActive: true,
    },
  });

  const respSanPedro = await prisma.user.create({
    data: {
      nom: "Bamba",
      prenom: "Fatou",
      email: "resp.sanpedro@aibef.ci",
      username: "resp.sanpedro",
      password: hashedPass,
      role: "RESPONSABLE_ANTENNE",
      telephone: "+225 07 01 00 00 03",
      antenneId: antenneSanPedro.id,
      typeJournee: "FIXE",
      isActive: true,
    },
  });

  // ADMINISTRATIF (3)
  const adminAbidjan = await prisma.user.create({
    data: {
      nom: "Yao",
      prenom: "Koffi",
      email: "admin.abidjan@aibef.ci",
      username: "admin.abidjan",
      password: hashedPass,
      role: "ADMINISTRATIF",
      telephone: "+225 07 02 00 00 01",
      antenneId: antenneAbidjan.id,
      typeJournee: "FIXE",
      isActive: true,
    },
  });

  const adminBouake = await prisma.user.create({
    data: {
      nom: "Diallo",
      prenom: "Aminata",
      email: "admin.bouake@aibef.ci",
      username: "admin.bouake",
      password: hashedPass,
      role: "ADMINISTRATIF",
      telephone: "+225 07 02 00 00 02",
      antenneId: antenneBouake.id,
      typeJournee: "FIXE",
      isActive: true,
    },
  });

  const adminSanPedro = await prisma.user.create({
    data: {
      nom: "Kone",
      prenom: "Ibrahim",
      email: "admin.sanpedro@aibef.ci",
      username: "admin.sanpedro",
      password: hashedPass,
      role: "ADMINISTRATIF",
      telephone: "+225 07 02 00 00 03",
      antenneId: antenneSanPedro.id,
      typeJournee: "FIXE",
      isActive: true,
    },
  });

  // SOIGNANT (6 - 2 per antenne)
  const soignant1Abidjan = await prisma.user.create({
    data: {
      nom: "Aka",
      prenom: "Jeanne",
      email: "soignant1.abidjan@aibef.ci",
      username: "soignant1.abidjan",
      password: hashedPass,
      role: "SOIGNANT",
      telephone: "+225 07 03 00 00 01",
      antenneId: antenneAbidjan.id,
      typeJournee: "FIXE",
      isActive: true,
    },
  });

  const soignant2Abidjan = await prisma.user.create({
    data: {
      nom: "Gnamba",
      prenom: "Marie",
      email: "soignant2.abidjan@aibef.ci",
      username: "soignant2.abidjan",
      password: hashedPass,
      role: "SOIGNANT",
      telephone: "+225 07 03 00 00 02",
      antenneId: antenneAbidjan.id,
      typeJournee: "VARIABLE",
      isActive: true,
    },
  });

  const soignant1Bouake = await prisma.user.create({
    data: {
      nom: "Ouattara",
      prenom: "Ali",
      email: "soignant1.bouake@aibef.ci",
      username: "soignant1.bouake",
      password: hashedPass,
      role: "SOIGNANT",
      telephone: "+225 07 03 00 00 03",
      antenneId: antenneBouake.id,
      typeJournee: "FIXE",
      isActive: true,
    },
  });

  const soignant2Bouake = await prisma.user.create({
    data: {
      nom: "Coulibaly",
      prenom: "Fanta",
      email: "soignant2.bouake@aibef.ci",
      username: "soignant2.bouake",
      password: hashedPass,
      role: "SOIGNANT",
      telephone: "+225 07 03 00 00 04",
      antenneId: antenneBouake.id,
      typeJournee: "FIXE",
      isActive: true,
    },
  });

  const soignant1SanPedro = await prisma.user.create({
    data: {
      nom: "Dje",
      prenom: "Paul",
      email: "soignant1.sanpedro@aibef.ci",
      username: "soignant1.sanpedro",
      password: hashedPass,
      role: "SOIGNANT",
      telephone: "+225 07 03 00 00 05",
      antenneId: antenneSanPedro.id,
      typeJournee: "FIXE",
      isActive: true,
    },
  });

  const soignant2SanPedro = await prisma.user.create({
    data: {
      nom: "Tape",
      prenom: "Celestine",
      email: "soignant2.sanpedro@aibef.ci",
      username: "soignant2.sanpedro",
      password: hashedPass,
      role: "SOIGNANT",
      telephone: "+225 07 03 00 00 06",
      antenneId: antenneSanPedro.id,
      typeJournee: "VARIABLE",
      isActive: true,
    },
  });

  console.log("Creation des projets...");

  // ======================== PROJETS ========================

  const projet1 = await prisma.projet.create({
    data: {
      nom: "Programme Sante Reproductive 2026",
      description:
        "Programme national de sante reproductive et planification familiale pour l'annee 2026",
      dateDebut: new Date("2026-01-01"),
      dateFin: new Date("2026-12-31"),
      isActive: true,
    },
  });

  const projet2 = await prisma.projet.create({
    data: {
      nom: "Campagne Vaccination HPV",
      description:
        "Campagne de vaccination contre le papillomavirus humain dans les zones rurales",
      dateDebut: new Date("2026-02-01"),
      dateFin: new Date("2026-06-30"),
      antenneId: antenneAbidjan.id,
      isActive: true,
    },
  });

  console.log("Creation des activites...");

  // ======================== ACTIVITES ========================

  const activite1 = await prisma.activite.create({
    data: {
      titre: "Formation sur les nouvelles directives PF",
      description:
        "Session de formation pour le personnel soignant sur les nouvelles directives en matiere de planification familiale",
      type: "PONCTUELLE",
      statut: "REALISEE",
      dateDebut: new Date("2026-01-15"),
      dateFin: new Date("2026-01-17"),
      dateRealisee: new Date("2026-01-17"),
      budget: 1500000,
      projetId: projet1.id,
      createurId: superAdmin.id,
    },
  });

  const activite2 = await prisma.activite.create({
    data: {
      titre: "Sensibilisation communautaire IST/VIH",
      description:
        "Campagne de sensibilisation dans les communautes sur la prevention des IST et du VIH",
      type: "PERIODIQUE",
      frequence: "TRIMESTRIELLE",
      statut: "EN_COURS",
      dateDebut: new Date("2026-02-01"),
      dateFin: new Date("2026-03-31"),
      budget: 2000000,
      projetId: projet1.id,
      createurId: superAdmin.id,
    },
  });

  const activite3 = await prisma.activite.create({
    data: {
      titre: "Vaccination HPV - Phase 1 Abidjan",
      description:
        "Premiere phase de la campagne de vaccination HPV dans les ecoles d'Abidjan",
      type: "PONCTUELLE",
      statut: "PLANIFIEE",
      dateDebut: new Date("2026-03-01"),
      dateFin: new Date("2026-03-15"),
      budget: 3500000,
      projetId: projet2.id,
      createurId: respAbidjan.id,
    },
  });

  const activite4 = await prisma.activite.create({
    data: {
      titre: "Inventaire equipements medicaux",
      description:
        "Inventaire complet de tous les equipements medicaux dans les antennes",
      type: "PONCTUELLE",
      statut: "EN_RETARD",
      dateDebut: new Date("2026-01-10"),
      dateFin: new Date("2026-02-10"),
      createurId: superAdmin.id,
    },
  });

  console.log("Creation des affectations activite-antenne...");

  // ======================== ACTIVITE ANTENNES ========================

  // Activite 1 - toutes les antennes
  await prisma.activiteAntenne.createMany({
    data: [
      {
        activiteId: activite1.id,
        antenneId: antenneAbidjan.id,
        responsableId: soignant1Abidjan.id,
        statut: "REALISEE",
        commentaire: "Formation realisee avec succes",
      },
      {
        activiteId: activite1.id,
        antenneId: antenneBouake.id,
        responsableId: soignant1Bouake.id,
        statut: "REALISEE",
        commentaire: "10 participants",
      },
    ],
  });

  // Activite 2 - Bouake et San Pedro
  await prisma.activiteAntenne.createMany({
    data: [
      {
        activiteId: activite2.id,
        antenneId: antenneBouake.id,
        responsableId: soignant2Bouake.id,
        statut: "EN_COURS",
      },
      {
        activiteId: activite2.id,
        antenneId: antenneSanPedro.id,
        responsableId: soignant1SanPedro.id,
        statut: "EN_COURS",
      },
    ],
  });

  // Activite 3 - Abidjan uniquement
  await prisma.activiteAntenne.create({
    data: {
      activiteId: activite3.id,
      antenneId: antenneAbidjan.id,
      responsableId: soignant2Abidjan.id,
      statut: "PLANIFIEE",
    },
  });

  // Activite 4 - toutes les antennes
  await prisma.activiteAntenne.createMany({
    data: [
      {
        activiteId: activite4.id,
        antenneId: antenneAbidjan.id,
        responsableId: adminAbidjan.id,
        statut: "EN_RETARD",
      },
      {
        activiteId: activite4.id,
        antenneId: antenneBouake.id,
        responsableId: adminBouake.id,
        statut: "EN_RETARD",
      },
      {
        activiteId: activite4.id,
        antenneId: antenneSanPedro.id,
        responsableId: adminSanPedro.id,
        statut: "EN_RETARD",
      },
    ],
  });

  console.log("Creation des recommandations...");

  // ======================== RECOMMANDATIONS ========================

  const recommandation1 = await prisma.recommandation.create({
    data: {
      titre: "Renforcer le stock de contraceptifs injectables",
      description:
        "Suite a la supervision, il a ete constate une rupture frequente de contraceptifs injectables. Approvisionner en urgence.",
      source: "SUPERVISION",
      typeResolution: "PERMANENTE",
      statut: "EN_COURS",
      priorite: "HAUTE",
      dateEcheance: new Date("2026-03-15"),
      antenneId: antenneAbidjan.id,
      activiteId: activite1.id,
    },
  });

  const recommandation2 = await prisma.recommandation.create({
    data: {
      titre: "Mettre a jour les registres de consultation",
      description:
        "Les registres de consultation ne sont pas a jour depuis decembre 2025. Proceder a la mise a jour complete.",
      source: "REUNION",
      typeResolution: "PONCTUELLE",
      statut: "EN_RETARD",
      priorite: "HAUTE",
      dateEcheance: new Date("2026-02-01"),
      antenneId: antenneBouake.id,
    },
  });

  const recommandation3 = await prisma.recommandation.create({
    data: {
      titre: "Organiser une reunion de coordination trimestrielle",
      description:
        "Planifier et organiser une reunion de coordination entre toutes les antennes pour le suivi des activites.",
      source: "ACTIVITE",
      typeResolution: "PERIODIQUE",
      statut: "EN_ATTENTE",
      priorite: "MOYENNE",
      dateEcheance: new Date("2026-03-31"),
      frequence: "TRIMESTRIELLE",
      antenneId: antenneSanPedro.id,
      activiteId: activite2.id,
    },
  });

  // ======================== RECOMMANDATION RESPONSABLES ========================

  await prisma.recommandationResponsable.createMany({
    data: [
      {
        recommandationId: recommandation1.id,
        userId: respAbidjan.id,
        isPrincipal: true,
      },
      {
        recommandationId: recommandation1.id,
        userId: adminAbidjan.id,
        isPrincipal: false,
      },
      {
        recommandationId: recommandation2.id,
        userId: respBouake.id,
        isPrincipal: true,
      },
      {
        recommandationId: recommandation3.id,
        userId: respSanPedro.id,
        isPrincipal: true,
      },
    ],
  });

  console.log("Creation des pointages...");

  // ======================== POINTAGES (semaine courante) ========================

  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1); // Lundi courant
  monday.setHours(0, 0, 0, 0);

  const allEmployees = [
    soignant1Abidjan,
    soignant2Abidjan,
    adminAbidjan,
    soignant1Bouake,
    soignant2Bouake,
    adminBouake,
    soignant1SanPedro,
    soignant2SanPedro,
    adminSanPedro,
  ];

  // Nombre de jours ouvres ecoules cette semaine (lundi=0, ..., vendredi=4)
  const dayOfWeek = now.getDay(); // 0=dimanche, 1=lundi, ...
  const businessDaysPassed = Math.min(
    Math.max(dayOfWeek === 0 ? 5 : dayOfWeek - 1, 0),
    5
  );

  const pointageData: Array<{
    date: Date;
    heureArrivee: Date;
    heureDepart: Date | null;
    statut: "PRESENT" | "ABSENT" | "RETARD" | "CONGE";
    retardMinutes: number;
    heuresSupp: number;
    userId: string;
  }> = [];

  for (let dayOffset = 0; dayOffset < businessDaysPassed; dayOffset++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + dayOffset);

    for (const emp of allEmployees) {
      // Varier les statuts pour du realisme
      let statut: "PRESENT" | "ABSENT" | "RETARD" | "CONGE" = "PRESENT";
      let retardMinutes = 0;
      let heuresSupp = 0;

      // Quelques variations
      if (dayOffset === 2 && emp.id === soignant2Abidjan.id) {
        statut = "RETARD";
        retardMinutes = 25;
      } else if (dayOffset === 1 && emp.id === soignant1SanPedro.id) {
        statut = "ABSENT";
      } else if (dayOffset === 3 && emp.id === adminBouake.id) {
        statut = "CONGE";
      } else if (dayOffset === 0 && emp.id === soignant1Bouake.id) {
        heuresSupp = 1.5;
      }

      const heureArrivee = new Date(date);
      heureArrivee.setHours(
        statut === "RETARD" ? 8 : 7,
        statut === "RETARD" ? retardMinutes : 55,
        0,
        0
      );

      const heureDepart =
        statut === "ABSENT" || statut === "CONGE"
          ? null
          : new Date(date);
      if (heureDepart) {
        heureDepart.setHours(16 + (heuresSupp > 0 ? Math.floor(heuresSupp) : 0), 0, 0, 0);
      }

      pointageData.push({
        date,
        heureArrivee,
        heureDepart,
        statut,
        retardMinutes,
        heuresSupp,
        userId: emp.id,
      });
    }
  }

  if (pointageData.length > 0) {
    await prisma.pointage.createMany({ data: pointageData });
  }

  console.log("Creation des conges...");

  // ======================== CONGES ========================

  await prisma.conge.create({
    data: {
      type: "ANNUEL",
      statut: "SOUMIS",
      dateDebut: new Date("2026-03-10"),
      dateFin: new Date("2026-03-21"),
      nbJours: 10,
      motif: "Conge annuel - vacances familiales",
      employeId: soignant1Abidjan.id,
    },
  });

  await prisma.conge.create({
    data: {
      type: "MALADIE",
      statut: "APPROUVE_RESPONSABLE",
      dateDebut: new Date("2026-02-20"),
      dateFin: new Date("2026-02-24"),
      nbJours: 3,
      motif: "Consultation medicale et repos",
      employeId: soignant2Bouake.id,
      approbateurId: respBouake.id,
      dateApprobation: new Date("2026-02-18"),
      commentaireApprobateur: "Approuve, bon retablissement",
    },
  });

  console.log("Creation des logs d'audit...");

  // ======================== AUDIT LOGS ========================

  await prisma.auditLog.createMany({
    data: [
      {
        action: "LOGIN",
        entite: "User",
        entiteId: superAdmin.id,
        details: "Connexion reussie",
        userId: superAdmin.id,
      },
      {
        action: "CREATE",
        entite: "Activite",
        entiteId: activite1.id,
        details: `Creation de l'activite: ${activite1.titre}`,
        userId: superAdmin.id,
      },
      {
        action: "CREATE",
        entite: "Activite",
        entiteId: activite2.id,
        details: `Creation de l'activite: ${activite2.titre}`,
        userId: superAdmin.id,
      },
      {
        action: "STATUS_CHANGE",
        entite: "Activite",
        entiteId: activite1.id,
        details: "Statut change de PLANIFIEE a REALISEE",
        userId: respAbidjan.id,
      },
      {
        action: "CREATE",
        entite: "Recommandation",
        entiteId: recommandation1.id,
        details: `Creation de la recommandation: ${recommandation1.titre}`,
        userId: superAdmin.id,
      },
    ],
  });

  // ======================== SUMMARY ========================

  console.log("");
  console.log("========================================");
  console.log("  Base de donnees initialisee avec succes");
  console.log("========================================");
  console.log("");
  console.log("Comptes crees:");
  console.log("  SUPER_ADMIN:          admin / admin123");
  console.log("  RESP. Abidjan:        resp.abidjan / pass123");
  console.log("  RESP. Bouake:         resp.bouake / pass123");
  console.log("  RESP. San Pedro:      resp.sanpedro / pass123");
  console.log("  ADMIN. Abidjan:       admin.abidjan / pass123");
  console.log("  ADMIN. Bouake:        admin.bouake / pass123");
  console.log("  ADMIN. San Pedro:     admin.sanpedro / pass123");
  console.log("  SOIGNANT 1 Abidjan:   soignant1.abidjan / pass123");
  console.log("  SOIGNANT 2 Abidjan:   soignant2.abidjan / pass123");
  console.log("  SOIGNANT 1 Bouake:    soignant1.bouake / pass123");
  console.log("  SOIGNANT 2 Bouake:    soignant2.bouake / pass123");
  console.log("  SOIGNANT 1 San Pedro: soignant1.sanpedro / pass123");
  console.log("  SOIGNANT 2 San Pedro: soignant2.sanpedro / pass123");
  console.log("");
  console.log("Donnees crees:");
  console.log("  3 Antennes");
  console.log("  13 Utilisateurs");
  console.log("  2 Projets");
  console.log("  4 Activites avec affectations");
  console.log("  3 Recommandations avec responsables");
  console.log(`  ${pointageData.length} Pointages (semaine courante)`);
  console.log("  2 Conges");
  console.log("  5 Logs d'audit");
  console.log("");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Erreur lors du seed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
