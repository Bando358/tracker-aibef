-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'RESPONSABLE_ANTENNE', 'ADMINISTRATIF', 'SOIGNANT');

-- CreateEnum
CREATE TYPE "TypeActivite" AS ENUM ('PONCTUELLE', 'PERIODIQUE');

-- CreateEnum
CREATE TYPE "Frequence" AS ENUM ('MENSUELLE', 'TRIMESTRIELLE', 'ANNUELLE');

-- CreateEnum
CREATE TYPE "StatutActivite" AS ENUM ('PLANIFIEE', 'EN_COURS', 'REALISEE', 'EN_RETARD', 'ANNULEE', 'REPROGRAMMEE');

-- CreateEnum
CREATE TYPE "SourceRecommandation" AS ENUM ('ACTIVITE', 'REUNION', 'SUPERVISION', 'FORMATION');

-- CreateEnum
CREATE TYPE "TypeResolution" AS ENUM ('PERMANENTE', 'PONCTUELLE', 'PERIODIQUE');

-- CreateEnum
CREATE TYPE "StatutRecommandation" AS ENUM ('EN_ATTENTE', 'EN_COURS', 'PARTIELLEMENT_REALISEE', 'RESOLUE', 'EN_RETARD', 'ANNULEE');

-- CreateEnum
CREATE TYPE "Priorite" AS ENUM ('HAUTE', 'MOYENNE', 'BASSE');

-- CreateEnum
CREATE TYPE "TypeJournee" AS ENUM ('FIXE', 'VARIABLE');

-- CreateEnum
CREATE TYPE "StatutPointage" AS ENUM ('PRESENT', 'ABSENT', 'RETARD', 'CONGE');

-- CreateEnum
CREATE TYPE "TypeConge" AS ENUM ('ANNUEL', 'MALADIE', 'MATERNITE', 'PATERNITE', 'EXCEPTIONNEL', 'SANS_SOLDE');

-- CreateEnum
CREATE TYPE "StatutConge" AS ENUM ('BROUILLON', 'SOUMIS', 'APPROUVE_RESPONSABLE', 'APPROUVE_FINAL', 'REFUSE', 'ANNULE');

-- CreateEnum
CREATE TYPE "TypeNotification" AS ENUM ('ACTIVITE_EN_RETARD', 'RECOMMANDATION_EN_RETARD', 'CONGE_SOUMIS', 'CONGE_APPROUVE', 'CONGE_REFUSE', 'ASSIGNATION_ACTIVITE', 'ASSIGNATION_RECOMMANDATION', 'RAPPEL_POINTAGE', 'SYSTEME');

-- CreateEnum
CREATE TYPE "ActionAudit" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'APPROVE', 'REJECT', 'STATUS_CHANGE');

-- CreateTable
CREATE TABLE "antennes" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "nom" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "ville" TEXT NOT NULL,
    "adresse" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "antennes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "telephone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'SOIGNANT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "image" TEXT,
    "antenneId" TEXT,
    "typeJournee" "TypeJournee" NOT NULL DEFAULT 'FIXE',
    "heureDebutFixe" TEXT DEFAULT '08:00',
    "heureFinFixe" TEXT DEFAULT '16:00',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projets" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "antenneId" TEXT,

    CONSTRAINT "projets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activites" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "type" "TypeActivite" NOT NULL,
    "frequence" "Frequence",
    "statut" "StatutActivite" NOT NULL DEFAULT 'PLANIFIEE',
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "dateRealisee" TIMESTAMP(3),
    "budget" DOUBLE PRECISION,
    "observations" TEXT,
    "projetId" TEXT,
    "createurId" TEXT NOT NULL,

    CONSTRAINT "activites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activite_antennes" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "activiteId" TEXT NOT NULL,
    "antenneId" TEXT NOT NULL,
    "responsableId" TEXT NOT NULL,
    "statut" "StatutActivite" NOT NULL DEFAULT 'PLANIFIEE',
    "commentaire" TEXT,

    CONSTRAINT "activite_antennes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activite_historiques" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activiteId" TEXT NOT NULL,
    "ancienStatut" "StatutActivite" NOT NULL,
    "nouveauStatut" "StatutActivite" NOT NULL,
    "commentaire" TEXT,
    "modifiePar" TEXT NOT NULL,

    CONSTRAINT "activite_historiques_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommandations" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "source" "SourceRecommandation" NOT NULL,
    "typeResolution" "TypeResolution" NOT NULL,
    "statut" "StatutRecommandation" NOT NULL DEFAULT 'EN_ATTENTE',
    "priorite" "Priorite" NOT NULL DEFAULT 'MOYENNE',
    "dateEcheance" TIMESTAMP(3) NOT NULL,
    "dateResolution" TIMESTAMP(3),
    "frequence" "Frequence",
    "observations" TEXT,
    "activiteId" TEXT,
    "antenneId" TEXT,

    CONSTRAINT "recommandations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommandation_responsables" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recommandationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isPrincipal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "recommandation_responsables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommandation_historiques" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recommandationId" TEXT NOT NULL,
    "ancienStatut" "StatutRecommandation" NOT NULL,
    "nouveauStatut" "StatutRecommandation" NOT NULL,
    "commentaire" TEXT,
    "modifiePar" TEXT NOT NULL,

    CONSTRAINT "recommandation_historiques_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pointages" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "date" DATE NOT NULL,
    "heureArrivee" TIMESTAMP(3),
    "heureDepart" TIMESTAMP(3),
    "statut" "StatutPointage" NOT NULL DEFAULT 'PRESENT',
    "retardMinutes" INTEGER NOT NULL DEFAULT 0,
    "heuresSupp" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "observations" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "pointages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conges" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "type" "TypeConge" NOT NULL,
    "statut" "StatutConge" NOT NULL DEFAULT 'BROUILLON',
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "nbJours" INTEGER NOT NULL,
    "motif" TEXT NOT NULL,
    "commentaireApprobateur" TEXT,
    "employeId" TEXT NOT NULL,
    "approbateurId" TEXT,
    "dateApprobation" TIMESTAMP(3),

    CONSTRAINT "conges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "TypeNotification" NOT NULL,
    "titre" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "lue" BOOLEAN NOT NULL DEFAULT false,
    "lien" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" "ActionAudit" NOT NULL,
    "entite" TEXT NOT NULL,
    "entiteId" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "antennes_nom_key" ON "antennes"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "antennes_code_key" ON "antennes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "activite_antennes_activiteId_antenneId_key" ON "activite_antennes"("activiteId", "antenneId");

-- CreateIndex
CREATE UNIQUE INDEX "recommandation_responsables_recommandationId_userId_key" ON "recommandation_responsables"("recommandationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "pointages_userId_date_key" ON "pointages"("userId", "date");

-- CreateIndex
CREATE INDEX "notifications_userId_lue_idx" ON "notifications"("userId", "lue");

-- CreateIndex
CREATE INDEX "audit_logs_entite_entiteId_idx" ON "audit_logs"("entite", "entiteId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_antenneId_fkey" FOREIGN KEY ("antenneId") REFERENCES "antennes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projets" ADD CONSTRAINT "projets_antenneId_fkey" FOREIGN KEY ("antenneId") REFERENCES "antennes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activites" ADD CONSTRAINT "activites_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "projets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activites" ADD CONSTRAINT "activites_createurId_fkey" FOREIGN KEY ("createurId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activite_antennes" ADD CONSTRAINT "activite_antennes_activiteId_fkey" FOREIGN KEY ("activiteId") REFERENCES "activites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activite_antennes" ADD CONSTRAINT "activite_antennes_antenneId_fkey" FOREIGN KEY ("antenneId") REFERENCES "antennes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activite_antennes" ADD CONSTRAINT "activite_antennes_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activite_historiques" ADD CONSTRAINT "activite_historiques_activiteId_fkey" FOREIGN KEY ("activiteId") REFERENCES "activites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommandations" ADD CONSTRAINT "recommandations_activiteId_fkey" FOREIGN KEY ("activiteId") REFERENCES "activites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommandations" ADD CONSTRAINT "recommandations_antenneId_fkey" FOREIGN KEY ("antenneId") REFERENCES "antennes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommandation_responsables" ADD CONSTRAINT "recommandation_responsables_recommandationId_fkey" FOREIGN KEY ("recommandationId") REFERENCES "recommandations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommandation_responsables" ADD CONSTRAINT "recommandation_responsables_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommandation_historiques" ADD CONSTRAINT "recommandation_historiques_recommandationId_fkey" FOREIGN KEY ("recommandationId") REFERENCES "recommandations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pointages" ADD CONSTRAINT "pointages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conges" ADD CONSTRAINT "conges_employeId_fkey" FOREIGN KEY ("employeId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conges" ADD CONSTRAINT "conges_approbateurId_fkey" FOREIGN KEY ("approbateurId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
