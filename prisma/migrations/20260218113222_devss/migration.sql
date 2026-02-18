-- CreateEnum
CREATE TYPE "Periodicite" AS ENUM ('LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'AVANT_JOUR_DU_MOIS');

-- AlterTable
ALTER TABLE "activites" ADD COLUMN     "jourPeriodicite" INTEGER,
ADD COLUMN     "periodicite" "Periodicite";
