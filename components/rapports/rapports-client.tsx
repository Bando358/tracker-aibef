"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { DateRangeFilters, MonthFilters } from "./rapport-filters";
import {
  fetchActiviteReport,
  fetchRecommandationReport,
  fetchPointageReport,
  fetchPerformanceReport,
} from "@/lib/actions/rapport.actions";
import type {
  ActiviteReportData,
  RecommandationReportData,
  PointageReportData,
  PerformanceReportData,
} from "@/lib/actions/rapport.actions";
import {
  STATUT_ACTIVITE_LABELS,
  STATUT_POINTAGE_LABELS,
  ROLE_LABELS,
} from "@/lib/constants";

// ======================== TYPES ========================

interface AntenneOption { id: string; nom: string }
interface ProjetOption { id: string; code: string; nom: string }

interface RapportsClientProps {
  antennes: AntenneOption[];
  projets: ProjetOption[];
  initialActiviteData: ActiviteReportData;
  initialRecommandationData: RecommandationReportData;
  initialPointageData: PointageReportData;
  initialPerformanceData: PerformanceReportData;
}

// ======================== STAT CARD ========================

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="rounded-xl border border-border/60 p-3 text-center">
      <p className={`text-2xl font-bold tabular-nums ${color ?? ""}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
    </div>
  );
}

// ======================== COMPONENT ========================

export function RapportsClient({
  antennes,
  projets,
  initialActiviteData,
  initialRecommandationData,
  initialPointageData,
  initialPerformanceData,
}: RapportsClientProps) {
  const [isPending, startTransition] = useTransition();
  const now = new Date();

  // Activite filters & data
  const [actFilters, setActFilters] = useState({
    dateDebut: `${now.getFullYear()}-01-01`,
    dateFin: `${now.getFullYear()}-12-31`,
    antenneId: "__all__",
    projetId: "__all__",
  });
  const [actData, setActData] = useState(initialActiviteData);

  // Recommandation filters & data
  const [recFilters, setRecFilters] = useState({
    dateDebut: `${now.getFullYear()}-01-01`,
    dateFin: `${now.getFullYear()}-12-31`,
    antenneId: "__all__",
  });
  const [recData, setRecData] = useState(initialRecommandationData);

  // Pointage filters & data
  const [ptgFilters, setPtgFilters] = useState({
    mois: now.getMonth() + 1,
    annee: now.getFullYear(),
    antenneId: "__all__",
  });
  const [ptgData, setPtgData] = useState(initialPointageData);

  // Performance filters & data
  const [perfFilters, setPerfFilters] = useState({
    dateDebut: `${now.getFullYear()}-01-01`,
    dateFin: `${now.getFullYear()}-12-31`,
    antenneId: "__all__",
  });
  const [perfData, setPerfData] = useState(initialPerformanceData);

  function filterActivites() {
    startTransition(async () => {
      const data = await fetchActiviteReport({
        dateDebut: actFilters.dateDebut,
        dateFin: actFilters.dateFin,
        antenneId: actFilters.antenneId === "__all__" ? undefined : actFilters.antenneId,
        projetId: actFilters.projetId === "__all__" ? undefined : actFilters.projetId,
      });
      setActData(data);
    });
  }

  function filterRecommandations() {
    startTransition(async () => {
      const data = await fetchRecommandationReport({
        dateDebut: recFilters.dateDebut,
        dateFin: recFilters.dateFin,
        antenneId: recFilters.antenneId === "__all__" ? undefined : recFilters.antenneId,
      });
      setRecData(data);
    });
  }

  function filterPointages() {
    startTransition(async () => {
      const data = await fetchPointageReport({
        mois: ptgFilters.mois,
        annee: ptgFilters.annee,
        antenneId: ptgFilters.antenneId === "__all__" ? undefined : ptgFilters.antenneId,
      });
      setPtgData(data);
    });
  }

  function filterPerformance() {
    startTransition(async () => {
      const data = await fetchPerformanceReport({
        dateDebut: perfFilters.dateDebut,
        dateFin: perfFilters.dateFin,
        antenneId: perfFilters.antenneId === "__all__" ? undefined : perfFilters.antenneId,
      });
      setPerfData(data);
    });
  }

  return (
    <Tabs defaultValue="activites" className="space-y-6">
      <TabsList className="no-print">
        <TabsTrigger value="activites">Activites</TabsTrigger>
        <TabsTrigger value="recommandations">Recommandations</TabsTrigger>
        <TabsTrigger value="pointages">Pointages</TabsTrigger>
        <TabsTrigger value="performance">Performance</TabsTrigger>
      </TabsList>

      {/* ================================================================ */}
      {/* RAPPORT ACTIVITES                                                */}
      {/* ================================================================ */}
      <TabsContent value="activites" className="space-y-6">
        <DateRangeFilters
          dateDebut={actFilters.dateDebut}
          dateFin={actFilters.dateFin}
          antenneId={actFilters.antenneId}
          antennes={antennes}
          projets={projets}
          projetId={actFilters.projetId}
          onDateDebutChange={(v) => setActFilters((p) => ({ ...p, dateDebut: v }))}
          onDateFinChange={(v) => setActFilters((p) => ({ ...p, dateFin: v }))}
          onAntenneChange={(v) => setActFilters((p) => ({ ...p, antenneId: v }))}
          onProjetChange={(v) => setActFilters((p) => ({ ...p, projetId: v }))}
          onFilter={filterActivites}
          onPrint={() => window.print()}
          isPending={isPending}
        />

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <StatCard label="Total" value={actData.total} />
          <StatCard label="Realisees" value={actData.realisees} color="text-green-600" />
          <StatCard label="En cours" value={actData.enCours} color="text-amber-600" />
          <StatCard label="En retard" value={actData.enRetard} color="text-red-600" />
          <StatCard label="Non planifiees" value={actData.nonPlanifiees} color="text-slate-500" />
          <StatCard label="Suspendues" value={actData.suspendues} color="text-orange-600" />
          <StatCard label="Taux realisation" value={`${actData.tauxRealisation}%`} color="text-blue-600" />
        </div>

        {/* Par projet */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Synthese par projet</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-3 py-2 text-left font-semibold">Projet</th>
                    <th className="px-3 py-2 text-right font-semibold">Total</th>
                    <th className="px-3 py-2 text-right font-semibold">Realisees</th>
                    <th className="px-3 py-2 text-right font-semibold">Taux</th>
                  </tr>
                </thead>
                <tbody>
                  {actData.parProjet.map((p) => (
                    <tr key={p.code} className="border-b hover:bg-muted/20">
                      <td className="px-3 py-2 font-medium">{p.code} - {p.nom}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{p.total}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-green-600">{p.realisees}</td>
                      <td className="px-3 py-2 text-right">
                        <Badge variant="outline" className={`text-xs ${p.taux >= 80 ? "text-green-600 border-green-300" : p.taux >= 50 ? "text-amber-600 border-amber-300" : "text-red-600 border-red-300"}`}>
                          {p.taux}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Detail */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Detail des activites ({actData.activites.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-3 py-2 text-left font-semibold">Activite</th>
                    <th className="px-3 py-2 text-left font-semibold">Projet</th>
                    <th className="px-3 py-2 text-left font-semibold">Statut</th>
                    <th className="px-3 py-2 text-left font-semibold">Antennes</th>
                    <th className="px-3 py-2 text-right font-semibold">Periodes</th>
                    <th className="px-3 py-2 text-right font-semibold">Budget</th>
                  </tr>
                </thead>
                <tbody>
                  {actData.activites.slice(0, 100).map((a) => (
                    <tr key={a.id} className="border-b hover:bg-muted/20">
                      <td className="px-3 py-2 font-medium max-w-[250px] truncate" title={a.titre}>{a.titre}</td>
                      <td className="px-3 py-2 text-muted-foreground">{a.projetCode ?? "-"}</td>
                      <td className="px-3 py-2"><StatusBadge status={a.statut} label={STATUT_ACTIVITE_LABELS[a.statut]} /></td>
                      <td className="px-3 py-2">{a.antennes.join(", ") || "-"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {a.nbPeriodesRealisees}/{a.nbPeriodes}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {a.budget ? new Intl.NumberFormat("fr-FR").format(a.budget) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ================================================================ */}
      {/* RAPPORT RECOMMANDATIONS                                          */}
      {/* ================================================================ */}
      <TabsContent value="recommandations" className="space-y-6">
        <DateRangeFilters
          dateDebut={recFilters.dateDebut}
          dateFin={recFilters.dateFin}
          antenneId={recFilters.antenneId}
          antennes={antennes}
          onDateDebutChange={(v) => setRecFilters((p) => ({ ...p, dateDebut: v }))}
          onDateFinChange={(v) => setRecFilters((p) => ({ ...p, dateFin: v }))}
          onAntenneChange={(v) => setRecFilters((p) => ({ ...p, antenneId: v }))}
          onFilter={filterRecommandations}
          onPrint={() => window.print()}
          isPending={isPending}
        />

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatCard label="Total" value={recData.total} />
          <StatCard label="Resolues" value={recData.resolues} color="text-green-600" />
          <StatCard label="En cours" value={recData.enCours} color="text-amber-600" />
          <StatCard label="En retard" value={recData.enRetard} color="text-red-600" />
          <StatCard label="Taux resolution" value={`${recData.tauxResolution}%`} color="text-blue-600" />
        </div>

        {/* Par priorite et source */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Par priorite</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recData.parPriorite.map((p) => (
                  <div key={p.label} className="flex items-center justify-between">
                    <StatusBadge status={p.label} />
                    <span className="text-sm font-bold tabular-nums">{p.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Par source</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recData.parSource.map((s) => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className="text-sm">{s.label.replace(/_/g, " ")}</span>
                    <span className="text-sm font-bold tabular-nums">{s.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detail */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Detail des recommandations ({recData.recommandations.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-3 py-2 text-left font-semibold">Titre</th>
                    <th className="px-3 py-2 text-left font-semibold">Source</th>
                    <th className="px-3 py-2 text-left font-semibold">Priorite</th>
                    <th className="px-3 py-2 text-left font-semibold">Statut</th>
                    <th className="px-3 py-2 text-left font-semibold">Antenne</th>
                    <th className="px-3 py-2 text-left font-semibold">Responsables</th>
                  </tr>
                </thead>
                <tbody>
                  {recData.recommandations.slice(0, 100).map((r) => (
                    <tr key={r.id} className="border-b hover:bg-muted/20">
                      <td className="px-3 py-2 font-medium max-w-[200px] truncate" title={r.titre}>{r.titre}</td>
                      <td className="px-3 py-2">{r.source.replace(/_/g, " ")}</td>
                      <td className="px-3 py-2"><StatusBadge status={r.priorite} /></td>
                      <td className="px-3 py-2"><StatusBadge status={r.statut} /></td>
                      <td className="px-3 py-2">{r.antenne ?? "-"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.responsables.join(", ") || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ================================================================ */}
      {/* RAPPORT POINTAGE                                                 */}
      {/* ================================================================ */}
      <TabsContent value="pointages" className="space-y-6">
        <MonthFilters
          mois={ptgFilters.mois}
          annee={ptgFilters.annee}
          antenneId={ptgFilters.antenneId}
          antennes={antennes}
          onMoisChange={(v) => setPtgFilters((p) => ({ ...p, mois: v }))}
          onAnneeChange={(v) => setPtgFilters((p) => ({ ...p, annee: v }))}
          onAntenneChange={(v) => setPtgFilters((p) => ({ ...p, antenneId: v }))}
          onFilter={filterPointages}
          onPrint={() => window.print()}
          isPending={isPending}
        />

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <StatCard label="Effectif" value={ptgData.totalEmployes} />
          <StatCard label="Jours ouvrables" value={ptgData.totalJoursOuvrables} />
          <StatCard label="Taux presence" value={`${ptgData.tauxPresence}%`} color="text-green-600" />
          <StatCard label="Total retards" value={ptgData.totalRetards} color="text-amber-600" />
          <StatCard label="Total absences" value={ptgData.totalAbsences} color="text-red-600" />
          <StatCard label="Total heures" value={`${ptgData.totalHeuresGlobal}h`} color="text-blue-600" />
          <StatCard label="Mois" value={ptgData.moisLabel} />
        </div>

        {/* Tableau employes */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Recapitulatif par employe ({ptgData.employes.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-3 py-2 text-left font-semibold">Employe</th>
                    <th className="px-3 py-2 text-left font-semibold">Fonction</th>
                    <th className="px-3 py-2 text-right font-semibold">Present</th>
                    <th className="px-3 py-2 text-right font-semibold">Retard</th>
                    <th className="px-3 py-2 text-right font-semibold">Absent</th>
                    <th className="px-3 py-2 text-right font-semibold">Conge</th>
                    <th className="px-3 py-2 text-right font-semibold">Mission</th>
                    <th className="px-3 py-2 text-right font-semibold">Maladie</th>
                    <th className="px-3 py-2 text-right font-semibold">Total h</th>
                    <th className="px-3 py-2 text-right font-semibold">Retard (min)</th>
                    <th className="px-3 py-2 text-right font-semibold">Moy. arrivee</th>
                    <th className="px-3 py-2 text-right font-semibold">Moy. depart</th>
                  </tr>
                </thead>
                <tbody>
                  {ptgData.employes.map((e) => (
                    <tr key={e.userId} className="border-b hover:bg-muted/20">
                      <td className="px-3 py-2 font-medium whitespace-nowrap">{e.prenom} {e.nom}</td>
                      <td className="px-3 py-2 text-muted-foreground">{ROLE_LABELS[e.role] ?? e.role}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-green-600 font-medium">{e.joursPresent}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-amber-600 font-medium">{e.joursRetard}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-red-600 font-medium">{e.joursAbsent}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{e.joursConge || "-"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{e.joursMission || "-"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{e.joursMaladie || "-"}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-bold">{e.totalHeures}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {e.totalRetardMinutes > 0 ? (
                          <span className="text-amber-600">{e.totalRetardMinutes}</span>
                        ) : "-"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{e.moyArrivee ?? "-"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{e.moyDepart ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ================================================================ */}
      {/* RAPPORT PERFORMANCE                                              */}
      {/* ================================================================ */}
      <TabsContent value="performance" className="space-y-6">
        <DateRangeFilters
          dateDebut={perfFilters.dateDebut}
          dateFin={perfFilters.dateFin}
          antenneId={perfFilters.antenneId}
          antennes={antennes}
          onDateDebutChange={(v) => setPerfFilters((p) => ({ ...p, dateDebut: v }))}
          onDateFinChange={(v) => setPerfFilters((p) => ({ ...p, dateFin: v }))}
          onAntenneChange={(v) => setPerfFilters((p) => ({ ...p, antenneId: v }))}
          onFilter={filterPerformance}
          onPrint={() => window.print()}
          isPending={isPending}
        />

        {/* Performance par antenne */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Performance par antenne</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-3 py-2 text-left font-semibold">Antenne</th>
                    <th className="px-3 py-2 text-right font-semibold">Activites</th>
                    <th className="px-3 py-2 text-right font-semibold">Realisees</th>
                    <th className="px-3 py-2 text-right font-semibold">En retard</th>
                    <th className="px-3 py-2 text-right font-semibold">Taux realisation</th>
                    <th className="px-3 py-2 text-right font-semibold">Recommandations</th>
                    <th className="px-3 py-2 text-right font-semibold">Resolues</th>
                    <th className="px-3 py-2 text-right font-semibold">Taux resolution</th>
                  </tr>
                </thead>
                <tbody>
                  {perfData.parAntenne.map((a) => (
                    <tr key={a.antenneId} className="border-b hover:bg-muted/20">
                      <td className="px-3 py-2">
                        <Link href={`/rapports/performance-antenne/${a.antenneId}`} className="font-medium text-primary hover:underline">
                          {a.antenne}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{a.totalActivites}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-green-600">{a.realisees}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-red-600">{a.enRetard}</td>
                      <td className="px-3 py-2 text-right">
                        <TauxBadge taux={a.tauxRealisation} />
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{a.totalRecommandations}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-green-600">{a.recommandationsResolues}</td>
                      <td className="px-3 py-2 text-right">
                        <TauxBadge taux={a.tauxResolution} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Performance par employe */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Performance par employe ({perfData.parEmploye.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-3 py-2 text-left font-semibold">Employe</th>
                    <th className="px-3 py-2 text-left font-semibold">Fonction</th>
                    <th className="px-3 py-2 text-left font-semibold">Antenne</th>
                    <th className="px-3 py-2 text-right font-semibold">Activites</th>
                    <th className="px-3 py-2 text-right font-semibold">Periodes</th>
                    <th className="px-3 py-2 text-right font-semibold">Realisees</th>
                    <th className="px-3 py-2 text-right font-semibold">En retard</th>
                    <th className="px-3 py-2 text-right font-semibold">Taux</th>
                  </tr>
                </thead>
                <tbody>
                  {perfData.parEmploye.map((e) => (
                    <tr key={e.userId} className="border-b hover:bg-muted/20">
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Link href={`/rapports/performance-employe/${e.userId}`} className="font-medium text-primary hover:underline">
                          {e.prenom} {e.nom}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{ROLE_LABELS[e.role] ?? e.role}</td>
                      <td className="px-3 py-2">{e.antenne ?? "-"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{e.activitesAssignees}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{e.totalPeriodes}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-green-600">{e.periodesRealisees}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-red-600">{e.periodesEnRetard}</td>
                      <td className="px-3 py-2 text-right">
                        <TauxBadge taux={e.tauxRealisation} />
                      </td>
                    </tr>
                  ))}
                  {perfData.parEmploye.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                        Aucun employe avec des activites assignees
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Performance par groupe (Volontaire / MAJ) */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Performance par groupe (Volontaires & MAJ)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-3 py-2 text-left font-semibold">Groupe</th>
                    <th className="px-3 py-2 text-right font-semibold">Effectif</th>
                    <th className="px-3 py-2 text-right font-semibold">Activites</th>
                    <th className="px-3 py-2 text-right font-semibold">Periodes</th>
                    <th className="px-3 py-2 text-right font-semibold">Realisees</th>
                    <th className="px-3 py-2 text-right font-semibold">En retard</th>
                    <th className="px-3 py-2 text-right font-semibold">Taux realisation</th>
                  </tr>
                </thead>
                <tbody>
                  {perfData.parGroupe.map((g) => (
                    <tr key={g.groupe} className="border-b hover:bg-muted/20">
                      <td className="px-3 py-2">
                        <Link href={`/rapports/performance-groupe/${g.groupe}`}>
                          <Badge variant="outline" className="text-xs cursor-pointer hover:bg-primary/10">
                            {g.groupe === "VOLONTAIRE" ? "Volontaires" : "MAJ (Mouvement Action Jeune)"}
                          </Badge>
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium">{g.effectif}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{g.activitesAssignees}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{g.totalPeriodes}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-green-600">{g.periodesRealisees}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-red-600">{g.periodesEnRetard}</td>
                      <td className="px-3 py-2 text-right">
                        <TauxBadge taux={g.tauxRealisation} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

// ======================== TAUX BADGE ========================

function TauxBadge({ taux }: { taux: number }) {
  const color =
    taux >= 80
      ? "text-green-600 border-green-300 bg-green-50"
      : taux >= 50
        ? "text-amber-600 border-amber-300 bg-amber-50"
        : "text-red-600 border-red-300 bg-red-50";
  return (
    <Badge variant="outline" className={`text-xs tabular-nums ${color}`}>
      {taux}%
    </Badge>
  );
}
