"use client";

import React, { useState, useEffect, useTransition, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { format, getDaysInMonth, getDay } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2, Save, ChevronLeft, ChevronRight, AlertTriangle, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  upsertPointageManuel,
  getPointagesForMonth,
  getCongesApprouvesForMonth,
} from "@/lib/actions/pointage.actions";
import { STATUT_POINTAGE_LABELS, FIXED_HOURS } from "@/lib/constants";
import { isJourFerie, getJoursFeries, validatePointageTimes } from "@/lib/date-utils";
import { useRouter } from "next/navigation";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
const JOURS_SEMAINE = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

const STATUT_OPTIONS = [
  "PRESENT",
  "ABSENT",
  "CONGE",
  "MISSION",
  "ARRET_MALADIE",
  "ABSENCE_AUTORISEE",
  "ABSENCE_NON_AUTORISEE",
  "FERIE",
] as const;

interface LignePointage {
  date: string;
  jour: string;
  numero: number;
  isWeekend: boolean;
  isDimanche: boolean;
  isFerie: boolean;
  ferieNom: string;
  isConge: boolean;
  heureArrivee: string;
  pauseDebut: string;
  pauseFin: string;
  heureDepart: string;
  totalHeures: number;
  statut: string;
  observations: string;
  saved: boolean;
  modified: boolean;
  errors: string[];
}

interface PointageSaisieGridProps {
  userId: string;
  userName: string;
  userFonction: string;
  antenneName: string;
}

// ------------------------------------------------------------------
// Memoized Row Component
// ------------------------------------------------------------------
interface PointageRowProps {
  ligne: LignePointage;
  index: number;
  onUpdate: (index: number, field: keyof LignePointage, value: string) => void;
  onSave: (index: number) => void;
  isSaving: boolean;
  isPending: boolean;
}

const PointageRow = React.memo(
  function PointageRow({ ligne, index, onUpdate, onSave, isSaving, isPending }: PointageRowProps) {
    const hasErrors = ligne.errors.length > 0;

    const rowBg = ligne.isDimanche
      ? "bg-slate-200 dark:bg-slate-800/60"
      : ligne.isFerie || ligne.isWeekend
        ? "bg-slate-100 dark:bg-slate-900/40"
        : ligne.isConge
        ? "bg-blue-50 dark:bg-blue-950/20"
        : hasErrors
          ? "bg-red-50 dark:bg-red-950/20"
          : ligne.modified
            ? "bg-amber-50/60 dark:bg-amber-950/10"
            : ligne.saved
              ? "bg-green-400/30 dark:bg-green-700/30"
              : "hover:bg-muted/30";

    const totalColor = ligne.totalHeures > 0 && ligne.totalHeures < 8
      ? "text-red-600 font-bold"
      : ligne.totalHeures >= 8
        ? "text-green-700 font-medium"
        : "";

    return (
      <tr className={`border-b transition-colors ${rowBg}`}>
        <td className="px-2 py-1 font-medium whitespace-nowrap">
          <span className={ligne.isWeekend || ligne.isFerie ? "text-muted-foreground" : ""}>
            {ligne.jour}
          </span>
          {ligne.isFerie && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Calendar className="inline ml-1 h-3 w-3 text-orange-500" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{ligne.ferieNom}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </td>
        <td className="px-2 py-1 tabular-nums text-muted-foreground">{ligne.numero}</td>
        <td className="px-1 py-1">
          <input
            type="time"
            value={ligne.heureArrivee}
            onFocus={() => {
              if (!ligne.heureArrivee) onUpdate(index, "heureArrivee", FIXED_HOURS.start);
            }}
            onChange={(e) => onUpdate(index, "heureArrivee", e.target.value)}
            className="w-full min-w-[65px] rounded border border-input bg-background px-1 py-0.5 text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </td>
        <td className="px-1 py-1">
          <input
            type="time"
            value={ligne.pauseDebut}
            onFocus={() => {
              if (!ligne.pauseDebut) onUpdate(index, "pauseDebut", FIXED_HOURS.pauseDebut);
            }}
            onChange={(e) => onUpdate(index, "pauseDebut", e.target.value)}
            className="w-full min-w-[65px] rounded border border-input bg-background px-1 py-0.5 text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </td>
        <td className="px-1 py-1">
          <input
            type="time"
            value={ligne.pauseFin}
            onFocus={() => {
              if (!ligne.pauseFin) onUpdate(index, "pauseFin", FIXED_HOURS.pauseFin);
            }}
            onChange={(e) => onUpdate(index, "pauseFin", e.target.value)}
            className="w-full min-w-[65px] rounded border border-input bg-background px-1 py-0.5 text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </td>
        <td className="px-1 py-1">
          <input
            type="time"
            value={ligne.heureDepart}
            onFocus={() => {
              if (!ligne.heureDepart) onUpdate(index, "heureDepart", FIXED_HOURS.end);
            }}
            onChange={(e) => onUpdate(index, "heureDepart", e.target.value)}
            className="w-full min-w-[65px] rounded border border-input bg-background px-1 py-0.5 text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </td>
        <td className={`px-2 py-1 text-right tabular-nums ${totalColor}`}>
          {ligne.totalHeures > 0 ? ligne.totalHeures.toFixed(1) : "-"}
        </td>
        <td className="px-1 py-1">
          <Select
            value={ligne.statut}
            onValueChange={(val) => onUpdate(index, "statut", val)}
          >
            <SelectTrigger className="h-6 text-xs border-input min-w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUT_OPTIONS.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">
                  {STATUT_POINTAGE_LABELS[s] ?? s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </td>
        <td className="px-1 py-1">
          <input
            type="text"
            value={ligne.observations}
            onChange={(e) => onUpdate(index, "observations", e.target.value)}
            placeholder="-"
            className="w-full min-w-[80px] rounded border border-input bg-background px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </td>
        <td className="px-1 py-1 text-center">
          {hasErrors && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertTriangle className="inline h-3.5 w-3.5 text-red-500" />
                </TooltipTrigger>
                <TooltipContent>
                  {ligne.errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-600">{err}</p>
                  ))}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {ligne.modified && !hasErrors && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onSave(index)}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Save className="h-3 w-3" />
              )}
            </Button>
          )}
        </td>
      </tr>
    );
  },
  (prev, next) => {
    return (
      prev.ligne.heureArrivee === next.ligne.heureArrivee &&
      prev.ligne.pauseDebut === next.ligne.pauseDebut &&
      prev.ligne.pauseFin === next.ligne.pauseFin &&
      prev.ligne.heureDepart === next.ligne.heureDepart &&
      prev.ligne.statut === next.ligne.statut &&
      prev.ligne.observations === next.ligne.observations &&
      prev.ligne.totalHeures === next.ligne.totalHeures &&
      prev.ligne.saved === next.ligne.saved &&
      prev.ligne.modified === next.ligne.modified &&
      prev.ligne.errors.length === next.ligne.errors.length &&
      prev.isSaving === next.isSaving &&
      prev.isPending === next.isPending
    );
  }
);

// ------------------------------------------------------------------
// Mobile Card Row
// ------------------------------------------------------------------
const PointageMobileCard = React.memo(
  function PointageMobileCard({ ligne, index, onUpdate, onSave, isSaving, isPending }: PointageRowProps) {
    const hasErrors = ligne.errors.length > 0;

    const cardBg = ligne.isDimanche
      ? "border-slate-400 bg-slate-200 dark:bg-slate-800/60"
      : ligne.isFerie || ligne.isWeekend
        ? "border-slate-300 bg-slate-50 dark:bg-slate-900/40"
        : ligne.isConge
        ? "border-blue-300 bg-blue-50 dark:bg-blue-950/20"
        : hasErrors
          ? "border-red-300 bg-red-50 dark:bg-red-950/20"
          : ligne.saved
            ? "border-green-400 bg-green-400/30 dark:bg-green-700/30"
            : ligne.modified
              ? "border-amber-300 bg-amber-50/60"
              : "border-border/60";

    const totalColor = ligne.totalHeures > 0 && ligne.totalHeures < 8
      ? "text-red-600 font-bold"
      : ligne.totalHeures >= 8
        ? "text-green-700 font-medium"
        : "text-muted-foreground";

    return (
      <div className={`rounded-lg border p-3 space-y-2 ${cardBg}`}>
        {/* Header: Jour + Statut */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{ligne.jour} {ligne.numero}</span>
            {ligne.isFerie && (
              <Badge variant="outline" className="text-[10px] text-orange-600 border-orange-300">
                {ligne.ferieNom}
              </Badge>
            )}
            {ligne.isConge && (
              <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-300">
                Conge
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`text-sm tabular-nums ${totalColor}`}>
              {ligne.totalHeures > 0 ? `${ligne.totalHeures.toFixed(1)}h` : "-"}
            </span>
            {ligne.modified && !hasErrors && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onSave(index)}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Save className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Time fields */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-muted-foreground">Arrivee</label>
            <input
              type="time"
              value={ligne.heureArrivee}
              onFocus={() => { if (!ligne.heureArrivee) onUpdate(index, "heureArrivee", FIXED_HOURS.start); }}
              onChange={(e) => onUpdate(index, "heureArrivee", e.target.value)}
              className="w-full rounded border border-input bg-background px-1.5 py-1 text-xs tabular-nums"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">Depart</label>
            <input
              type="time"
              value={ligne.heureDepart}
              onFocus={() => { if (!ligne.heureDepart) onUpdate(index, "heureDepart", FIXED_HOURS.end); }}
              onChange={(e) => onUpdate(index, "heureDepart", e.target.value)}
              className="w-full rounded border border-input bg-background px-1.5 py-1 text-xs tabular-nums"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">Pause D.</label>
            <input
              type="time"
              value={ligne.pauseDebut}
              onFocus={() => { if (!ligne.pauseDebut) onUpdate(index, "pauseDebut", FIXED_HOURS.pauseDebut); }}
              onChange={(e) => onUpdate(index, "pauseDebut", e.target.value)}
              className="w-full rounded border border-input bg-background px-1.5 py-1 text-xs tabular-nums"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">Pause F.</label>
            <input
              type="time"
              value={ligne.pauseFin}
              onFocus={() => { if (!ligne.pauseFin) onUpdate(index, "pauseFin", FIXED_HOURS.pauseFin); }}
              onChange={(e) => onUpdate(index, "pauseFin", e.target.value)}
              className="w-full rounded border border-input bg-background px-1.5 py-1 text-xs tabular-nums"
            />
          </div>
        </div>

        {/* Statut + Observations */}
        <div className="flex items-center gap-2">
          <Select
            value={ligne.statut}
            onValueChange={(val) => onUpdate(index, "statut", val)}
          >
            <SelectTrigger className="h-7 text-xs border-input flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUT_OPTIONS.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">
                  {STATUT_POINTAGE_LABELS[s] ?? s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            type="text"
            value={ligne.observations}
            onChange={(e) => onUpdate(index, "observations", e.target.value)}
            placeholder="Obs."
            className="flex-1 rounded border border-input bg-background px-1.5 py-1 text-xs"
          />
        </div>

        {/* Errors */}
        {hasErrors && (
          <div className="text-xs text-red-600 space-y-0.5">
            {ligne.errors.map((err, i) => (
              <p key={i} className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                {err}
              </p>
            ))}
          </div>
        )}
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.ligne.heureArrivee === next.ligne.heureArrivee &&
      prev.ligne.pauseDebut === next.ligne.pauseDebut &&
      prev.ligne.pauseFin === next.ligne.pauseFin &&
      prev.ligne.heureDepart === next.ligne.heureDepart &&
      prev.ligne.statut === next.ligne.statut &&
      prev.ligne.observations === next.ligne.observations &&
      prev.ligne.totalHeures === next.ligne.totalHeures &&
      prev.ligne.saved === next.ligne.saved &&
      prev.ligne.modified === next.ligne.modified &&
      prev.ligne.errors.length === next.ligne.errors.length &&
      prev.isSaving === next.isSaving &&
      prev.isPending === next.isPending
    );
  }
);

// ------------------------------------------------------------------
// Main Component
// ------------------------------------------------------------------
export function PointageSaisieGrid({
  userId,
  userName,
  userFonction,
  antenneName,
}: PointageSaisieGridProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [lignes, setLignes] = useState<LignePointage[]>([]);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Jours feries pour l'annee en cours
  const joursFeriesMap = useMemo(() => {
    const feries = getJoursFeries(year);
    return new Map(feries.map((f) => [f.date, f.nom]));
  }, [year]);

  // Generate lines
  const generateLignes = useCallback(
    (
      existingPointages: Array<{
        date: Date | string;
        heureArrivee: Date | string | null;
        pauseDebut: Date | string | null;
        pauseFin: Date | string | null;
        heureDepart: Date | string | null;
        totalHeures: number;
        statut: string;
        observations: string | null;
      }>,
      conges: Array<{ dateDebut: Date; dateFin: Date; type: string }>
    ) => {
      const nbJours = getDaysInMonth(new Date(year, month - 1));
      const pointageMap = new Map(
        existingPointages.map((p) => {
          const d = new Date(p.date);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          return [key, p];
        })
      );

      // Build conge date set
      const congeDates = new Set<string>();
      for (const c of conges) {
        const start = new Date(c.dateDebut);
        const end = new Date(c.dateFin);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          congeDates.add(
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
          );
        }
      }

      const newLignes: LignePointage[] = [];
      for (let i = 1; i <= nbJours; i++) {
        const d = new Date(year, month - 1, i);
        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
        const dayOfWeek = getDay(d);
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const ferieInfo = joursFeriesMap.get(dateStr);
        const isFerie = !!ferieInfo;
        const isConge = congeDates.has(dateStr);
        const existing = pointageMap.get(dateStr);

        const formatTimeFromDate = (dt: Date | string | null | undefined): string => {
          if (!dt) return "";
          const date = new Date(dt);
          return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
        };

        // Determine default status
        let defaultStatut = "PRESENT";
        if (isWeekend || isFerie) defaultStatut = "FERIE";
        else if (isConge) defaultStatut = "CONGE";

        newLignes.push({
          date: dateStr,
          jour: JOURS_SEMAINE[dayOfWeek],
          numero: i,
          isWeekend,
          isDimanche: dayOfWeek === 0,
          isFerie,
          ferieNom: ferieInfo ?? "",
          isConge,
          heureArrivee: existing ? formatTimeFromDate(existing.heureArrivee) : "",
          pauseDebut: existing ? formatTimeFromDate(existing.pauseDebut) : "",
          pauseFin: existing ? formatTimeFromDate(existing.pauseFin) : "",
          heureDepart: existing ? formatTimeFromDate(existing.heureDepart) : "",
          totalHeures: existing?.totalHeures ?? 0,
          statut: existing?.statut ?? defaultStatut,
          observations: existing?.observations ?? "",
          saved: !!existing,
          modified: false,
          errors: [],
        });
      }
      setLignes(newLignes);
    },
    [month, year, joursFeriesMap]
  );

  // Load data
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [data, conges] = await Promise.all([
          getPointagesForMonth(userId, month, year),
          getCongesApprouvesForMonth(userId, month, year),
        ]);
        if (!cancelled) {
          generateLignes(
            JSON.parse(JSON.stringify(data)),
            JSON.parse(JSON.stringify(conges))
          );
        }
      } catch {
        if (!cancelled) {
          toast.error("Erreur lors du chargement");
          generateLignes([], []);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [userId, month, year, generateLignes]);

  // Update line with validation
  const updateLigne = useCallback((index: number, field: keyof LignePointage, value: string) => {
    setLignes((prev) => {
      const updated = [...prev];
      const ligne = { ...updated[index], [field]: value, modified: true };

      // Recalculate total hours
      if (["heureArrivee", "pauseDebut", "pauseFin", "heureDepart"].includes(field)) {
        const parseT = (t: string) => {
          if (!t) return null;
          const [h, m] = t.split(":").map(Number);
          return h * 60 + m;
        };
        const arr = parseT(ligne.heureArrivee);
        const pd = parseT(ligne.pauseDebut);
        const pf = parseT(ligne.pauseFin);
        const dep = parseT(ligne.heureDepart);

        if (arr !== null && dep !== null) {
          const pauseMin = pd !== null && pf !== null ? pf - pd : 0;
          ligne.totalHeures = Math.round(((dep - arr - pauseMin) / 60) * 100) / 100;
        } else {
          ligne.totalHeures = 0;
        }

        // Validate
        ligne.errors = validatePointageTimes(
          ligne.heureArrivee || null,
          ligne.pauseDebut || null,
          ligne.pauseFin || null,
          ligne.heureDepart || null
        );
      }

      updated[index] = ligne;
      return updated;
    });
  }, []);

  // Save single line (with race condition protection)
  const saveLigne = useCallback(async (index: number) => {
    const ligne = lignes[index];
    if (!ligne || !ligne.modified || ligne.errors.length > 0) return;

    // Prevent double save
    if (savingIndex !== null) return;
    setSavingIndex(index);

    startTransition(async () => {
      const result = await upsertPointageManuel(userId, {
        date: ligne.date,
        heureArrivee: ligne.heureArrivee || null,
        pauseDebut: ligne.pauseDebut || null,
        pauseFin: ligne.pauseFin || null,
        heureDepart: ligne.heureDepart || null,
        statut: ligne.statut,
        observations: ligne.observations || null,
      });

      if (result.success) {
        setLignes((prev) => {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            saved: true,
            modified: false,
            totalHeures: result.data!.totalHeures,
          };
          return updated;
        });
        toast.success(`${ligne.jour} ${ligne.numero} - Enregistre`);
      } else {
        toast.error(result.error);
      }
      setSavingIndex(null);
    });
  }, [lignes, savingIndex, userId, startTransition]);

  // Save all modified
  const saveAllModified = useCallback(async () => {
    const modified = lignes
      .map((l, i) => ({ ...l, index: i }))
      .filter((l) => l.modified && l.errors.length === 0);

    if (modified.length === 0) {
      toast.info("Aucune modification a enregistrer");
      return;
    }

    for (const ligne of modified) {
      setSavingIndex(ligne.index);
      const result = await upsertPointageManuel(userId, {
        date: ligne.date,
        heureArrivee: ligne.heureArrivee || null,
        pauseDebut: ligne.pauseDebut || null,
        pauseFin: ligne.pauseFin || null,
        heureDepart: ligne.heureDepart || null,
        statut: ligne.statut,
        observations: ligne.observations || null,
      });

      if (result.success) {
        setLignes((prev) => {
          const updated = [...prev];
          updated[ligne.index] = {
            ...updated[ligne.index],
            saved: true,
            modified: false,
            totalHeures: result.data!.totalHeures,
          };
          return updated;
        });
      } else {
        toast.error(`${ligne.jour} ${ligne.numero}: ${result.error}`);
      }
    }
    setSavingIndex(null);
    toast.success(`${modified.length} ligne(s) enregistree(s)`);
    router.refresh();
  }, [lignes, userId, router]);

  const modifiedCount = lignes.filter((l) => l.modified).length;
  const errorCount = lignes.filter((l) => l.errors.length > 0).length;
  const monthLabel = format(new Date(year, month - 1), "MMMM yyyy", { locale: fr });

  // Stats
  const stats = useMemo(() => {
    const joursTravailles = lignes.filter(
      (l) => l.saved && (l.statut === "PRESENT" || l.statut === "RETARD")
    );
    const totalJoursTravailles = joursTravailles.length;
    const totalAbsents = lignes.filter(
      (l) => l.saved && ["ABSENT", "ABSENCE_AUTORISEE", "ABSENCE_NON_AUTORISEE"].includes(l.statut)
    ).length;
    const totalHeuresMois = lignes.reduce((sum, l) => sum + l.totalHeures, 0);

    const parseTimeToMinutes = (t: string) => {
      if (!t) return null;
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };
    const formatMinutesToTime = (mins: number) => {
      const h = Math.floor(mins / 60);
      const m = Math.round(mins % 60);
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    };

    const arrivees = joursTravailles
      .map((l) => parseTimeToMinutes(l.heureArrivee))
      .filter((v): v is number => v !== null);
    const departs = joursTravailles
      .map((l) => parseTimeToMinutes(l.heureDepart))
      .filter((v): v is number => v !== null);

    const moyenneArrivee = arrivees.length > 0
      ? formatMinutesToTime(arrivees.reduce((a, b) => a + b, 0) / arrivees.length)
      : "--:--";
    const moyenneDepart = departs.length > 0
      ? formatMinutesToTime(departs.reduce((a, b) => a + b, 0) / departs.length)
      : "--:--";

    return { totalJoursTravailles, totalAbsents, totalHeuresMois, moyenneArrivee, moyenneDepart };
  }, [lignes]);

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">
              Fiche de presence - {userName}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {userFonction} | {antenneName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                if (month === 1) { setMonth(12); setYear(year - 1); }
                else setMonth(month - 1);
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium capitalize min-w-[120px] text-center">
              {monthLabel}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                if (month === 12) { setMonth(1); setYear(year + 1); }
                else setMonth(month + 1);
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3">
          <div className="rounded-lg border border-border/60 p-2 text-center">
            <p className="text-lg font-bold tabular-nums">{stats.totalJoursTravailles}</p>
            <p className="text-[10px] text-muted-foreground">Jours travailles</p>
          </div>
          <div className="rounded-lg border border-border/60 p-2 text-center">
            <p className="text-lg font-bold tabular-nums text-blue-600">{stats.totalHeuresMois.toFixed(1)}h</p>
            <p className="text-[10px] text-muted-foreground">Total heures</p>
          </div>
          <div className="rounded-lg border border-border/60 p-2 text-center">
            <p className="text-lg font-bold tabular-nums text-green-600">{stats.moyenneArrivee}</p>
            <p className="text-[10px] text-muted-foreground">Moy. arrivee</p>
          </div>
          <div className="rounded-lg border border-border/60 p-2 text-center">
            <p className="text-lg font-bold tabular-nums text-orange-600">{stats.moyenneDepart}</p>
            <p className="text-[10px] text-muted-foreground">Moy. depart</p>
          </div>
          <div className="rounded-lg border border-border/60 p-2 text-center">
            <p className="text-lg font-bold tabular-nums text-red-600">{stats.totalAbsents}</p>
            <p className="text-[10px] text-muted-foreground">Absences</p>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mt-2">
          {modifiedCount > 0 && (
            <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-300">
              {modifiedCount} non enregistree(s)
            </Badge>
          )}
          {errorCount > 0 && (
            <Badge className="text-xs bg-red-100 text-red-700 border-red-300">
              {errorCount} erreur(s)
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Desktop: Table */}
        {!isMobile ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-2 py-2 text-left font-semibold w-[55px]">Jour</th>
                  <th className="px-2 py-2 text-left font-semibold w-[30px]">N°</th>
                  <th className="px-1 py-2 text-left font-semibold">Arrivee</th>
                  <th className="px-1 py-2 text-left font-semibold">Pause D.</th>
                  <th className="px-1 py-2 text-left font-semibold">Pause F.</th>
                  <th className="px-1 py-2 text-left font-semibold">Depart</th>
                  <th className="px-2 py-2 text-right font-semibold w-[50px]">Total</th>
                  <th className="px-1 py-2 text-left font-semibold">Statut</th>
                  <th className="px-1 py-2 text-left font-semibold">Observations</th>
                  <th className="px-2 py-2 w-[40px]"></th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((ligne, index) => (
                  <PointageRow
                    key={ligne.date}
                    ligne={ligne}
                    index={index}
                    onUpdate={updateLigne}
                    onSave={saveLigne}
                    isSaving={isPending && savingIndex === index}
                    isPending={isPending}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Mobile: Card layout */
          <div className="space-y-2 p-3">
            {lignes.map((ligne, index) => (
              <PointageMobileCard
                key={ligne.date}
                ligne={ligne}
                index={index}
                onUpdate={updateLigne}
                onSave={saveLigne}
                isSaving={isPending && savingIndex === index}
                isPending={isPending}
              />
            ))}
          </div>
        )}

        {/* Footer: Save all */}
        {modifiedCount > 0 && (
          <div className="flex items-center justify-end gap-3 p-3 border-t bg-muted/20">
            <span className="text-xs text-muted-foreground">
              {modifiedCount} ligne(s) modifiee(s)
              {errorCount > 0 && ` (${errorCount} avec erreurs)`}
            </span>
            <Button
              size="sm"
              onClick={saveAllModified}
              disabled={isPending || savingIndex !== null}
            >
              {isPending || savingIndex !== null ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-3.5 w-3.5" />
              )}
              Tout enregistrer
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
