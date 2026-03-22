import { format, differenceInMinutes, eachDayOfInterval, isWeekend } from "date-fns";
import { fr } from "date-fns/locale";

export function formatDateFr(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "dd/MM/yyyy", { locale: fr });
}

export function formatDateTimeFr(date: Date | string): string {
  return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: fr });
}

export function formatTimeFr(date: Date | string): string {
  return format(new Date(date), "HH:mm", { locale: fr });
}

export function isOverdue(dateFin: Date | string): boolean {
  return new Date() > new Date(dateFin);
}

export function getTimeDiffMinutes(a: Date, b: Date): number {
  return differenceInMinutes(a, b);
}

export function countBusinessDays(start: Date, end: Date): number {
  const days = eachDayOfInterval({ start, end });
  return days.filter((day) => !isWeekend(day)).length;
}

export function parseTimeString(time: string): { hours: number; minutes: number } {
  const [hours, minutes] = time.split(":").map(Number);
  return { hours, minutes };
}

export function getMonthName(month: number): string {
  const date = new Date(2024, month, 1);
  return format(date, "MMMM", { locale: fr });
}

// ======================== TIMEZONE-SAFE DATE UTILITIES ========================

/**
 * Cree une date a minuit UTC (timezone-safe) pour eviter les decalages
 * entre serveur et client.
 */
export function toDateOnly(date: Date | string): Date {
  const d = new Date(date);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

/**
 * Retourne les bornes du mois en UTC.
 * month: 1-12 (pas 0-11)
 */
export function getMonthRange(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0)); // dernier jour du mois
  return { start, end };
}

/**
 * Retourne les bornes d'un jour en UTC pour les requetes de date.
 */
export function getDayRange(dateStr: string): { dayStart: Date; dayEnd: Date } {
  const d = new Date(dateStr);
  const dayStart = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayEnd = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate() + 1));
  return { dayStart, dayEnd };
}

// ======================== JOURS FERIES COTE D'IVOIRE ========================

/**
 * Calcul de la date de Paques (algorithme de Meeus/Jones/Butcher)
 */
function easterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/**
 * Retourne la liste des jours feries en Cote d'Ivoire pour une annee donnee.
 * Inclut les fetes fixes et les fetes mobiles (Paques, Ascension, Pentecote).
 * Note: Les fetes musulmanes (Ramadan, Tabaski, Maouloud) ne sont pas incluses
 * car elles dependent du calendrier lunaire et varient chaque annee.
 */
export function getJoursFeries(year: number): Array<{ date: string; nom: string }> {
  const easter = easterDate(year);
  const addDays = (d: Date, n: number) => {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
  };

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const lundiPaques = addDays(easter, 1);
  const ascension = addDays(easter, 39);
  const lundiPentecote = addDays(easter, 50);

  return [
    { date: `${year}-01-01`, nom: "Jour de l'An" },
    { date: `${year}-05-01`, nom: "Fete du Travail" },
    { date: `${year}-08-07`, nom: "Fete de l'Independance" },
    { date: `${year}-08-15`, nom: "Assomption" },
    { date: `${year}-11-01`, nom: "Toussaint" },
    { date: `${year}-11-15`, nom: "Journee de la Paix" },
    { date: `${year}-12-25`, nom: "Noel" },
    { date: fmt(lundiPaques), nom: "Lundi de Paques" },
    { date: fmt(ascension), nom: "Ascension" },
    { date: fmt(lundiPentecote), nom: "Lundi de Pentecote" },
  ];
}

/**
 * Verifie si une date (format YYYY-MM-DD) est un jour ferie.
 */
export function isJourFerie(dateStr: string, year?: number): { ferie: boolean; nom?: string } {
  const y = year ?? new Date(dateStr).getFullYear();
  const feries = getJoursFeries(y);
  const found = feries.find((f) => f.date === dateStr);
  return found ? { ferie: true, nom: found.nom } : { ferie: false };
}

// ======================== TIME VALIDATION ========================

/**
 * Valide que les heures d'un pointage sont coherentes.
 * Retourne un tableau d'erreurs (vide si tout est OK).
 */
export function validatePointageTimes(
  heureArrivee?: string | null,
  pauseDebut?: string | null,
  pauseFin?: string | null,
  heureDepart?: string | null
): string[] {
  const errors: string[] = [];
  const parseT = (t: string | null | undefined): number | null => {
    if (!t) return null;
    const [h, m] = t.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  };

  const arr = parseT(heureArrivee);
  const pd = parseT(pauseDebut);
  const pf = parseT(pauseFin);
  const dep = parseT(heureDepart);

  if (arr !== null && dep !== null && dep < arr) {
    errors.push("L'heure de depart doit etre apres l'heure d'arrivee");
  }
  if (pd !== null && pf !== null && pf < pd) {
    errors.push("La fin de pause doit etre apres le debut de pause");
  }
  if (pd !== null && arr !== null && pd < arr) {
    errors.push("Le debut de pause doit etre apres l'arrivee");
  }
  if (pf !== null && dep !== null && pf > dep) {
    errors.push("La fin de pause doit etre avant le depart");
  }
  if (pd !== null && !pf && dep !== null) {
    errors.push("Si le debut de pause est renseigne, la fin de pause doit l'etre aussi");
  }
  if (pf !== null && !pd) {
    errors.push("Si la fin de pause est renseignee, le debut de pause doit l'etre aussi");
  }

  return errors;
}
