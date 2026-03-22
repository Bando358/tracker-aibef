/**
 * Script Playwright - Capture d'écran automatique de TRACKER-AIBEF
 *
 * Usage:
 *   1. Lancez l'app en local:  npm run dev
 *   2. Lancez le script:       npx playwright test screenshots.spec.ts
 *
 * Les captures seront enregistrées dans:
 *   C:\Users\AIBEF\Desktop\screenshots-tracker-aibef\
 */

import { test, expect } from "@playwright/test";
import path from "path";

// ============================================================
// CONFIGURATION — Modifiez ici vos identifiants et URL
// ============================================================
const BASE_URL = "http://localhost:3000";
const LOGIN_USERNAME = "admin"; // <-- Votre identifiant
const LOGIN_PASSWORD = "admin123"; // <-- Votre mot de passe
const SCREENSHOT_DIR = path.join(
  "C:",
  "Users",
  "AIBEF",
  "Desktop",
  "screenshots-tracker-aibef"
);

// Attente après navigation (ms) pour laisser le temps aux données de charger
const WAIT_AFTER_NAV = 2500;

// ============================================================
// Pages à capturer (nom du fichier => route)
// ============================================================
const PAGES: { name: string; route: string; description: string }[] = [
  // Authentification
  { name: "01-login", route: "/login", description: "Page de connexion" },

  // Dashboard
  {
    name: "02-dashboard",
    route: "/dashboard",
    description: "Tableau de bord principal",
  },

  // Activités
  {
    name: "03-activites-liste",
    route: "/activites",
    description: "Liste des activités",
  },
  {
    name: "04-activites-nouvelle",
    route: "/activites/nouvelle",
    description: "Formulaire nouvelle activité",
  },

  // Employés
  {
    name: "05-employes-liste",
    route: "/employes",
    description: "Liste des employés",
  },
  {
    name: "06-employes-nouveau",
    route: "/employes/nouveau",
    description: "Formulaire nouvel employé",
  },

  // Congés
  {
    name: "07-conges-liste",
    route: "/conges",
    description: "Liste des congés",
  },
  {
    name: "08-conges-nouveau",
    route: "/conges/nouveau",
    description: "Formulaire nouvelle demande de congé",
  },

  // Recommandations
  {
    name: "09-recommandations-liste",
    route: "/recommandations",
    description: "Liste des recommandations",
  },
  {
    name: "10-recommandations-nouvelle",
    route: "/recommandations/nouvelle",
    description: "Formulaire nouvelle recommandation",
  },

  // Pointages
  {
    name: "11-pointages",
    route: "/pointages",
    description: "Gestion des pointages",
  },

  // Antennes
  {
    name: "12-antennes-liste",
    route: "/antennes",
    description: "Liste des antennes",
  },
  {
    name: "13-antennes-nouvelle",
    route: "/antennes/nouveau",
    description: "Formulaire nouvelle antenne",
  },

  // Administration
  {
    name: "14-audit-log",
    route: "/audit-log",
    description: "Journal d'audit",
  },
  {
    name: "15-empreintes",
    route: "/empreintes",
    description: "Gestion des empreintes digitales",
  },
];

// ============================================================
// Test principal
// ============================================================
test.describe("Captures d'écran - Manuel d'utilisation", () => {
  test.setTimeout(120_000); // 2 minutes max

  test("Capturer toutes les pages", async ({ page }) => {
    // Taille écran bureau standard
    await page.setViewportSize({ width: 1440, height: 900 });

    // ---- 1. Capture de la page de login AVANT connexion ----
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await page.waitForTimeout(WAIT_AFTER_NAV);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "01-login.png"),
      fullPage: true,
    });
    console.log("✓ 01-login.png");

    // ---- 2. Se connecter ----
    // Remplir le formulaire de login
    const usernameInput = page.locator(
      'input[name="identifiant"], input[name="username"], input[type="text"]'
    ).first();
    const passwordInput = page.locator(
      'input[name="motDePasse"], input[name="password"], input[type="password"]'
    ).first();

    await usernameInput.fill(LOGIN_USERNAME);
    await passwordInput.fill(LOGIN_PASSWORD);

    // Cliquer sur le bouton de connexion
    const submitBtn = page.locator(
      'button[type="submit"], button:has-text("Connexion"), button:has-text("Se connecter")'
    ).first();
    await submitBtn.click();

    // Attendre la redirection vers le dashboard
    await page.waitForURL("**/dashboard**", { timeout: 15000 }).catch(() => {
      console.log(
        "⚠ Pas de redirection vers /dashboard — vérifiez vos identifiants"
      );
    });
    await page.waitForTimeout(WAIT_AFTER_NAV);

    // ---- 3. Capturer chaque page (sauf login, déjà fait) ----
    for (const pageInfo of PAGES) {
      if (pageInfo.route === "/login") continue; // déjà capturé

      try {
        await page.goto(`${BASE_URL}${pageInfo.route}`, {
          waitUntil: "networkidle",
          timeout: 15000,
        });
        await page.waitForTimeout(WAIT_AFTER_NAV);

        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `${pageInfo.name}.png`),
          fullPage: true,
        });
        console.log(`✓ ${pageInfo.name}.png — ${pageInfo.description}`);
      } catch (err) {
        console.log(
          `✗ ${pageInfo.name}.png — ERREUR: ${(err as Error).message}`
        );
      }
    }

    // ---- 4. Capture du dashboard scrollé (onglet Congés) ----
    try {
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
      await page.waitForTimeout(WAIT_AFTER_NAV);

      // Cliquer sur l'onglet Congés s'il existe
      const congesTab = page.locator(
        'button[value="conges"], [role="tab"]:has-text("Congés"), [role="tab"]:has-text("Conges")'
      ).first();
      if (await congesTab.isVisible()) {
        await congesTab.click();
        await page.waitForTimeout(1500);
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, "02b-dashboard-conges.png"),
          fullPage: true,
        });
        console.log("✓ 02b-dashboard-conges.png — Dashboard onglet Congés");
      }

      // Cliquer sur l'onglet Retards s'il existe
      const retardsTab = page.locator(
        'button[value="retards"], [role="tab"]:has-text("Retards")'
      ).first();
      if (await retardsTab.isVisible()) {
        await retardsTab.click();
        await page.waitForTimeout(1500);
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, "02c-dashboard-retards.png"),
          fullPage: true,
        });
        console.log("✓ 02c-dashboard-retards.png — Dashboard onglet Retards");
      }
    } catch {
      console.log("⚠ Impossible de capturer les onglets du dashboard");
    }

    console.log("\n🎉 Captures terminées !");
    console.log(`📁 Dossier: ${SCREENSHOT_DIR}`);
  });
});
