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
