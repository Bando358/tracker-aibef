"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
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
import { ChevronLeft, ChevronRight, Printer } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { fetchChronogrammeData } from "@/lib/actions/chronogramme.actions";
import type { ChronogrammeActivite } from "@/lib/actions/chronogramme.actions";
import { STATUT_ACTIVITE_LABELS } from "@/lib/constants";

const MOIS = ["Jan", "Fev", "Mar", "Avr", "Mai", "Jun", "Jul", "Aou", "Sep", "Oct", "Nov", "Dec"];

const STATUT_COLORS: Record<string, string> = {
  PLANIFIEE: "bg-blue-400",
  EN_COURS: "bg-amber-400",
  REALISEE: "bg-green-500",
  EN_RETARD: "bg-red-500",
  SUSPENDUE: "bg-orange-400",
  NON_PLANIFIEE: "bg-slate-300",
};

interface Props {
  initialData: ChronogrammeActivite[];
  antennes: { id: string; nom: string }[];
  projets: { id: string; code: string; nom: string }[];
  initialYear: number;
}

export function ChronogrammeClient({ initialData, antennes, projets, initialYear }: Props) {
  const [isPending, startTransition] = useTransition();
  const [annee, setAnnee] = useState(initialYear);
  const [antenneId, setAntenneId] = useState("__all__");
  const [projetId, setProjetId] = useState("__all__");
  const [data, setData] = useState(initialData);

  function refresh() {
    startTransition(async () => {
      const result = await fetchChronogrammeData(
        annee,
        antenneId === "__all__" ? undefined : antenneId,
        projetId === "__all__" ? undefined : projetId
      );
      setData(JSON.parse(JSON.stringify(result)));
    });
  }

  // Calculer position d'une barre sur la timeline (12 mois)
  function getBarStyle(dateDebut: Date, dateFin: Date) {
    const d1 = new Date(dateDebut);
    const d2 = new Date(dateFin);
    const yearStart = new Date(annee, 0, 1).getTime();
    const yearEnd = new Date(annee, 11, 31).getTime();
    const totalMs = yearEnd - yearStart;

    const start = Math.max(0, (d1.getTime() - yearStart) / totalMs) * 100;
    const end = Math.min(100, (d2.getTime() - yearStart) / totalMs) * 100;
    const width = Math.max(0.5, end - start);

    return { left: `${start}%`, width: `${width}%` };
  }

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex flex-wrap items-end gap-3 no-print">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setAnnee(annee - 1); }}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-bold min-w-[50px] text-center">{annee}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setAnnee(annee + 1); }}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Select value={antenneId} onValueChange={setAntenneId}>
          <SelectTrigger className="h-9 w-[150px] text-xs">
            <SelectValue placeholder="Antenne" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Toutes</SelectItem>
            {antennes.map((a) => (
              <SelectItem key={a.id} value={a.id} className="text-xs">{a.nom}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={projetId} onValueChange={setProjetId}>
          <SelectTrigger className="h-9 w-[180px] text-xs">
            <SelectValue placeholder="Projet" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tous</SelectItem>
            {projets.map((p) => (
              <SelectItem key={p.id} value={p.id} className="text-xs">{p.code}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" className="h-9" onClick={refresh} disabled={isPending}>
          Actualiser
        </Button>
        <Button size="sm" variant="outline" className="h-9" onClick={() => window.print()}>
          <Printer className="mr-1.5 h-3.5 w-3.5" /> Imprimer
        </Button>
      </div>

      {/* Chronogramme */}
      <Card className="border-border/60 overflow-hidden">
        <CardHeader className="pb-0 px-3 pt-3">
          <CardTitle className="text-sm">
            Chronogramme {annee} ({data.length} activites)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* En-tete mois */}
              <div className="flex border-b bg-muted/30">
                <div className="w-[280px] shrink-0 px-3 py-2 text-xs font-semibold border-r">
                  Activite
                </div>
                <div className="flex-1 flex">
                  {MOIS.map((m) => (
                    <div key={m} className="flex-1 text-center text-[10px] font-medium text-muted-foreground py-2 border-r border-border/30">
                      {m}
                    </div>
                  ))}
                </div>
              </div>

              {/* Lignes */}
              {data.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Aucune activite avec des periodes planifiees
                </div>
              ) : (
                data.map((act) => {
                  // Regrouper les periodes par antenne
                  const parAntenne = new Map<string, typeof act.periodes>();
                  for (const p of act.periodes) {
                    if (!parAntenne.has(p.antenne)) parAntenne.set(p.antenne, []);
                    parAntenne.get(p.antenne)!.push(p);
                  }
                  const antennes = Array.from(parAntenne.entries());

                  return (
                    <div key={act.id} className="flex border-b hover:bg-muted/20 transition-colors">
                      <div className="w-[280px] shrink-0 px-3 py-2 border-r flex flex-col justify-center">
                        <Link href={`/activites/${act.id}`} className="text-xs font-medium text-primary hover:underline line-clamp-2" title={act.titre}>
                          {act.titre}
                        </Link>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {act.projetCode ?? "-"}
                        </p>
                      </div>
                      <div className="flex-1">
                        {antennes.map(([antenneName, periodes], antenneIdx) => (
                          <div key={antenneName} className={`relative flex items-center ${antenneIdx > 0 ? "border-t border-border/20" : ""}`} style={{ height: "28px" }}>
                            {/* Grille mois */}
                            <div className="absolute inset-0 flex">
                              {MOIS.map((_, mi) => (
                                <div key={mi} className="flex-1 border-r border-border/10" />
                              ))}
                            </div>
                            {/* Label antenne */}
                            <div className="absolute left-1 top-0.5 text-[8px] text-muted-foreground/60 z-10 pointer-events-none">
                              {antenneName}
                            </div>
                            {/* Barres pour cette antenne */}
                            <TooltipProvider>
                              {periodes.map((p, pi) => {
                                const style = getBarStyle(p.dateDebut, p.dateFin);
                                const color = STATUT_COLORS[p.statut] ?? "bg-slate-400";
                                return (
                                  <Tooltip key={pi}>
                                    <TooltipTrigger asChild>
                                      <div
                                        className={`absolute h-3 rounded-sm ${color} opacity-80 hover:opacity-100 cursor-default transition-opacity`}
                                        style={{ ...style, top: "12px" }}
                                      />
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs bg-popover text-popover-foreground border p-2">
                                      <p className="font-medium">{p.antenne}</p>
                                      <p>{new Date(p.dateDebut).toLocaleDateString("fr-FR")} - {new Date(p.dateFin).toLocaleDateString("fr-FR")}</p>
                                      <StatusBadge status={p.statut} label={STATUT_ACTIVITE_LABELS[p.statut]} />
                                    </TooltipContent>
                                  </Tooltip>
                                );
                              })}
                            </TooltipProvider>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Legende */}
          <div className="flex flex-wrap gap-3 px-3 py-2 border-t bg-muted/10">
            {Object.entries(STATUT_COLORS).map(([statut, color]) => (
              <div key={statut} className="flex items-center gap-1.5">
                <div className={`h-3 w-3 rounded-sm ${color}`} />
                <span className="text-[10px] text-muted-foreground">
                  {STATUT_ACTIVITE_LABELS[statut] ?? statut}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
