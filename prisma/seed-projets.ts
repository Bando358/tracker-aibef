import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not defined");

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

const PROJETS = [
  {
    code: "P1.PNR1.1",
    nom: "Service de SSR sur mesure pour chacun",
    description:
      "Services de sante sexuelle et reproductive adaptes aux besoins de chaque client dans les cliniques du reseau AIBEF.",
    dateDebut: new Date("2026-01-01"),
    dateFin: new Date("2026-12-31"),
    budget: 474506745,
    typeFonds: "Non Restreints",
    bailleur: "AIBEF/IPPF Core Grant",
  },
  {
    code: "P1.PR1.1",
    nom: "Prestations SR/PF de qualite et innovants pour tous",
    description:
      "Offrir des prestations de sante reproductive et planification familiale de qualite innovantes.",
    dateDebut: new Date("2026-01-01"),
    dateFin: new Date("2026-03-31"),
    budget: 44070425,
    typeFonds: "Restreints",
    bailleur: "IPPF - Restreint",
  },
  {
    code: "P1.PR1.2",
    nom: "Projet DynPASS - PF",
    description:
      "Projet DynPASS pour la planification familiale dans les zones ciblees.",
    dateDebut: new Date("2026-01-01"),
    dateFin: new Date("2026-12-31"),
    budget: 257500156,
    typeFonds: "Restreints",
    bailleur: "KFW",
  },
  {
    code: "P1.PNR3.1",
    nom: 'Ma sante, mon "Topo"',
    description:
      "Programme de sensibilisation et d'education a la sante communautaire.",
    dateDebut: new Date("2026-01-01"),
    dateFin: new Date("2026-12-31"),
    budget: 2696000,
    typeFonds: "Non Restreints",
    bailleur: "AIBEF/IPPF Core Grant",
  },
  {
    code: "P2.PNR3.4",
    nom: 'Mon "Way" SRAJ',
    description:
      "Programme non restreint de sante reproductive des adolescents et jeunes.",
    dateDebut: new Date("2026-01-01"),
    dateFin: new Date("2026-12-31"),
    budget: 71404000,
    typeFonds: "Non Restreints",
    bailleur: "AIBEF/IPPF Core Grant",
  },
  {
    code: "P2.PR2.1",
    nom: "Prevention de la Fistule Obstetricale",
    description:
      "Prevention et prise en charge de la fistule obstetricale aupres des femmes.",
    dateDebut: new Date("2026-01-01"),
    dateFin: new Date("2026-12-31"),
    budget: 18960000,
    typeFonds: "Restreints",
    bailleur: "UNFPA",
  },
  {
    code: "P2.PR3.2",
    nom: "Projet d'Appui a des Services de Sante Adaptes aux Genre et Equitable",
    description:
      "Projet d'appui pour des services de sante adaptes au genre et equitables.",
    dateDebut: new Date("2026-01-01"),
    dateFin: new Date("2026-12-31"),
    budget: 33872000,
    typeFonds: "Restreints",
    bailleur: "Affaire Mondial Canada",
  },
  {
    code: "P3.PNR1.1",
    nom: "S&E",
    description:
      "Suivi et evaluation des programmes et activites de l'AIBEF.",
    dateDebut: new Date("2026-01-01"),
    dateFin: new Date("2026-12-31"),
    budget: 4290000,
    typeFonds: "Non Restreints",
    bailleur: "AIBEF/IPPF Core Grant",
  },
  {
    code: "P3.PR1.1",
    nom: "Developpement Organisationnel de l'AIBEF",
    description:
      "Renforcement des capacites organisationnelles de l'AIBEF.",
    dateDebut: new Date("2026-01-01"),
    dateFin: new Date("2026-01-31"),
    budget: 4320000,
    typeFonds: "Restreints",
    bailleur: "Equipop",
  },
  {
    code: "P3.PR1.2",
    nom: "FON",
    description: "Projet FON pour le renforcement institutionnel.",
    dateDebut: new Date("2026-01-01"),
    dateFin: new Date("2026-12-31"),
    budget: 64563490,
    typeFonds: "Restreints",
    bailleur: "IPPF - Restreint",
  },
  {
    code: "P4.PNR1.1",
    nom: "Management de la qualite de l'AIBEF",
    description:
      "Assurance qualite et management des services dans les cliniques AIBEF.",
    dateDebut: new Date("2026-01-01"),
    dateFin: new Date("2026-12-31"),
    budget: 23014000,
    typeFonds: "Non Restreints",
    bailleur: "AIBEF/IPPF Core Grant",
  },
  {
    code: "P4.PNR1.2",
    nom: "Gouvernance",
    description: "Renforcement de la gouvernance de l'AIBEF.",
    dateDebut: new Date("2026-01-01"),
    dateFin: new Date("2026-12-31"),
    budget: 36925884,
    typeFonds: "Non Restreints",
    bailleur: "AIBEF/IPPF Core Grant",
  },
  {
    code: "P4.PNR1.3",
    nom: "Gestion de l'AIBEF",
    description:
      "Gestion administrative et operationnelle de l'AIBEF.",
    dateDebut: new Date("2026-01-01"),
    dateFin: new Date("2026-12-31"),
    budget: 298134304,
    typeFonds: "Non Restreints",
    bailleur: "AIBEF/IPPF Core Grant",
  },
  {
    code: "P4.PNR1.4",
    nom: "Mobilisation de ressources",
    description:
      "Strategies et actions de mobilisation de ressources financieres et humaines.",
    dateDebut: new Date("2026-01-01"),
    dateFin: new Date("2026-12-31"),
    budget: 30720528,
    typeFonds: "Non Restreints",
    bailleur: "AIBEF/IPPF Core Grant",
  },
];

async function main() {
  console.log("Seeding projets (2026)...");

  for (const projet of PROJETS) {
    await prisma.projet.upsert({
      where: { code: projet.code },
      update: {
        nom: projet.nom,
        description: projet.description,
        dateDebut: projet.dateDebut,
        dateFin: projet.dateFin,
        budget: projet.budget,
        typeFonds: projet.typeFonds,
        bailleur: projet.bailleur,
      },
      create: projet,
    });
    console.log(`  -> ${projet.code}: ${projet.nom}`);
  }

  // Deactivate old projects no longer in the 2026 plan
  const activeCodes = PROJETS.map((p) => p.code);
  const deactivated = await prisma.projet.updateMany({
    where: {
      code: { notIn: activeCodes },
      isActive: true,
    },
    data: { isActive: false },
  });

  if (deactivated.count > 0) {
    console.log(
      `\n  Deactivated ${deactivated.count} old project(s) not in 2026 plan.`
    );
  }

  console.log(`\nDone! ${PROJETS.length} projets seeded.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
