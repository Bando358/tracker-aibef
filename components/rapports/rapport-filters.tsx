"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, Printer } from "lucide-react";

interface AntenneOption {
  id: string;
  nom: string;
}

interface ProjetOption {
  id: string;
  code: string;
  nom: string;
}

// ======================== Activite / Recommandation filters ========================

interface DateRangeFiltersProps {
  dateDebut: string;
  dateFin: string;
  antenneId: string;
  antennes: AntenneOption[];
  projets?: ProjetOption[];
  projetId?: string;
  onDateDebutChange: (v: string) => void;
  onDateFinChange: (v: string) => void;
  onAntenneChange: (v: string) => void;
  onProjetChange?: (v: string) => void;
  onFilter: () => void;
  onPrint: () => void;
  isPending: boolean;
}

export function DateRangeFilters({
  dateDebut,
  dateFin,
  antenneId,
  antennes,
  projets,
  projetId,
  onDateDebutChange,
  onDateFinChange,
  onAntenneChange,
  onProjetChange,
  onFilter,
  onPrint,
  isPending,
}: DateRangeFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-3 no-print">
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Debut</label>
        <Input
          type="date"
          value={dateDebut}
          onChange={(e) => onDateDebutChange(e.target.value)}
          className="h-9 w-[140px] text-xs"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Fin</label>
        <Input
          type="date"
          value={dateFin}
          onChange={(e) => onDateFinChange(e.target.value)}
          className="h-9 w-[140px] text-xs"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Antenne</label>
        <Select value={antenneId} onValueChange={onAntenneChange}>
          <SelectTrigger className="h-9 w-[160px] text-xs">
            <SelectValue placeholder="Toutes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Toutes</SelectItem>
            {antennes.map((a) => (
              <SelectItem key={a.id} value={a.id} className="text-xs">
                {a.nom}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {projets && onProjetChange && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Projet</label>
          <Select value={projetId ?? "__all__"} onValueChange={onProjetChange}>
            <SelectTrigger className="h-9 w-[180px] text-xs">
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tous</SelectItem>
              {projets.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-xs">
                  {p.code} - {p.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <Button size="sm" className="h-9" onClick={onFilter} disabled={isPending}>
        <Filter className="mr-1.5 h-3.5 w-3.5" />
        Filtrer
      </Button>
      <Button size="sm" variant="outline" className="h-9" onClick={onPrint}>
        <Printer className="mr-1.5 h-3.5 w-3.5" />
        Imprimer
      </Button>
    </div>
  );
}

// ======================== Pointage filters ========================

interface MonthFiltersProps {
  mois: number;
  annee: number;
  antenneId: string;
  antennes: AntenneOption[];
  onMoisChange: (v: number) => void;
  onAnneeChange: (v: number) => void;
  onAntenneChange: (v: string) => void;
  onFilter: () => void;
  onPrint: () => void;
  isPending: boolean;
}

const MOIS_OPTIONS = [
  { value: 1, label: "Janvier" },
  { value: 2, label: "Fevrier" },
  { value: 3, label: "Mars" },
  { value: 4, label: "Avril" },
  { value: 5, label: "Mai" },
  { value: 6, label: "Juin" },
  { value: 7, label: "Juillet" },
  { value: 8, label: "Aout" },
  { value: 9, label: "Septembre" },
  { value: 10, label: "Octobre" },
  { value: 11, label: "Novembre" },
  { value: 12, label: "Decembre" },
];

export function MonthFilters({
  mois,
  annee,
  antenneId,
  antennes,
  onMoisChange,
  onAnneeChange,
  onAntenneChange,
  onFilter,
  onPrint,
  isPending,
}: MonthFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-3 no-print">
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Mois</label>
        <Select value={String(mois)} onValueChange={(v) => onMoisChange(Number(v))}>
          <SelectTrigger className="h-9 w-[130px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MOIS_OPTIONS.map((m) => (
              <SelectItem key={m.value} value={String(m.value)} className="text-xs">
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Annee</label>
        <Select value={String(annee)} onValueChange={(v) => onAnneeChange(Number(v))}>
          <SelectTrigger className="h-9 w-[90px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026, 2027].map((y) => (
              <SelectItem key={y} value={String(y)} className="text-xs">
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Antenne</label>
        <Select value={antenneId} onValueChange={onAntenneChange}>
          <SelectTrigger className="h-9 w-[160px] text-xs">
            <SelectValue placeholder="Toutes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Toutes</SelectItem>
            {antennes.map((a) => (
              <SelectItem key={a.id} value={a.id} className="text-xs">
                {a.nom}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button size="sm" className="h-9" onClick={onFilter} disabled={isPending}>
        <Filter className="mr-1.5 h-3.5 w-3.5" />
        Filtrer
      </Button>
      <Button size="sm" variant="outline" className="h-9" onClick={onPrint}>
        <Printer className="mr-1.5 h-3.5 w-3.5" />
        Imprimer
      </Button>
    </div>
  );
}
