"use client";

import Link from "next/link";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Users,
  Target,
  Clock,
  CalendarClock,
  TrendingUp,
  ArrowRight,
  Calendar,
  CircleCheck,
  CircleX,
  Timer,
  Palmtree,
  CalendarDays,
  UserX,
  AlarmClockCheck,
  FileCheck2,
  FileClock,
  FileX2,
  BarChart3,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/dashboard/stat-card";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDateFr } from "@/lib/date-utils";
import {
  STATUT_ACTIVITE_LABELS,
  PRIORITE_LABELS,
  TYPE_CONGE_LABELS,
  STATUT_CONGE_LABELS,
} from "@/lib/constants";
import type {
  DashboardData,
  CongeItem,
  RetardItem,
} from "@/lib/actions/dashboard.actions";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LabelList,
} from "recharts";
import type { ChartDataPoint } from "@/types";

// ======================== PROPS ========================

interface DashboardClientProps {
  data: DashboardData;
  role: string;
}

// ======================== CHART HELPERS ========================

const PIE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--primary))",
];

const tooltipStyle = {
  borderRadius: "12px",
  border: "none",
  backgroundColor: "hsl(var(--card))",
  boxShadow: "0 10px 40px -10px hsl(var(--foreground) / 0.15)",
  padding: "8px 12px",
  color: "hsl(var(--foreground))",
};

// ======================== COMPONENT ========================

export function DashboardClient({ data, role }: DashboardClientProps) {
  const { kpis, pointageSummary, congesData, retardsData } = data;
  const isEmployee = role === "SOIGNANT" || role === "ADMINISTRATIF";
  const isManager = role === "SUPER_ADMIN" || role === "RESPONSABLE_ANTENNE";

  return (
    <div className="space-y-6">
      {/* Hero KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total activites"
          value={kpis.activitesTotal}
          description={`${kpis.activitesRealisees} realisee(s)`}
          icon={Activity}
          variant="primary"
        />
        <StatCard
          title="Taux de realisation"
          value={`${kpis.tauxRealisation}%`}
          description="Activites realisees / total"
          icon={TrendingUp}
          variant="success"
          trend={
            kpis.tauxRealisation > 0
              ? { value: kpis.tauxRealisation, isPositive: kpis.tauxRealisation >= 50 }
              : undefined
          }
        />
        <StatCard
          title="Recommandations"
          value={kpis.recommandationsTotal}
          description={`${kpis.recommandationsResolues} resolue(s)`}
          icon={Target}
        />
        <StatCard
          title="Taux de resolution"
          value={`${kpis.tauxResolution}%`}
          description="Recommandations resolues / total"
          icon={CheckCircle2}
          variant="success"
          trend={
            kpis.tauxResolution > 0
              ? { value: kpis.tauxResolution, isPositive: kpis.tauxResolution >= 50 }
              : undefined
          }
        />
      </div>

      {/* Secondary KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Activites en retard"
          value={kpis.activitesEnRetard}
          description="Necessitent une attention"
          icon={AlertTriangle}
          variant={kpis.activitesEnRetard > 0 ? "danger" : "default"}
        />
        <StatCard
          title="Retards ce mois"
          value={retardsData.totalRetardsMois}
          description={`${retardsData.totalRetardMinutes} min cumulees`}
          icon={Timer}
          variant={retardsData.totalRetardsMois > 0 ? "warning" : "default"}
        />
        <StatCard
          title="Absences ce mois"
          value={retardsData.totalAbsencesMois}
          description={isManager ? `${retardsData.employesAvecRetard} employe(s) concerne(s)` : "Jours d'absence"}
          icon={UserX}
          variant={retardsData.totalAbsencesMois > 0 ? "danger" : "default"}
        />
        <StatCard
          title="Conges en attente"
          value={congesData.enAttente}
          description={isEmployee ? "Mes demandes soumises" : "Demandes a traiter"}
          icon={CalendarClock}
          variant={congesData.enAttente > 0 ? "warning" : "default"}
        />
      </div>

      {/* Pointage summary for employees */}
      {isEmployee && pointageSummary && (
        <Card className="overflow-hidden border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-1.5">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="text-sm font-semibold">
                Mon pointage de la semaine
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <PointageItem
                label="Present"
                value={pointageSummary.present}
                icon={CircleCheck}
                colorClass="text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-400"
              />
              <PointageItem
                label="Absent"
                value={pointageSummary.absent}
                icon={CircleX}
                colorClass="text-red-600 bg-red-100 dark:bg-red-900/40 dark:text-red-400"
              />
              <PointageItem
                label="Retard"
                value={pointageSummary.retard}
                icon={Timer}
                colorClass="text-amber-600 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-400"
              />
              <PointageItem
                label="Conge"
                value={pointageSummary.conge}
                icon={Palmtree}
                colorClass="text-blue-600 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-400"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== Detail section — visually distinct from KPI cards ===== */}
      <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 shadow-inner sm:p-6">
        {/* Section title */}
        <div className="mb-4 flex items-center gap-2">
          <div className="h-5 w-1 rounded-full bg-primary" />
          <h2 className="text-base font-semibold tracking-tight">Vue detaillee</h2>
        </div>

        <Tabs defaultValue="activites" className="space-y-5">
          <TabsList className="grid w-full grid-cols-3 h-auto gap-2 rounded-xl bg-background/80 p-1.5 shadow-sm border border-border/50 sm:gap-3">
            {/* Tab Activites */}
            <TabsTrigger
              value="activites"
              className="group/tab relative overflow-hidden rounded-lg p-0 text-left shadow-none transition-all duration-300 data-[state=active]:bg-card data-[state=active]:shadow-md data-[state=active]:shadow-primary/10 data-[state=inactive]:hover:bg-accent/50"
            >
              {/* Active gradient top bar */}
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary via-primary/80 to-primary/40 opacity-0 transition-opacity duration-300 group-data-[state=active]/tab:opacity-100" />

              <div className="relative flex flex-col gap-1.5 px-3 py-2.5 sm:px-4 sm:py-3">
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-primary/10 p-1.5 transition-all duration-300 group-data-[state=active]/tab:bg-primary group-data-[state=active]/tab:shadow-sm group-data-[state=active]/tab:shadow-primary/25">
                      <Activity className="h-3.5 w-3.5 text-primary transition-colors duration-300 group-data-[state=active]/tab:text-primary-foreground" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold">Activites</span>
                      <p className="hidden text-[10px] text-muted-foreground sm:block">
                        Suivi et performance
                      </p>
                    </div>
                  </div>
                  <span className="text-base font-bold text-primary sm:text-lg">
                    {kpis.activitesTotal}
                  </span>
                </div>
                {/* Mini progress bar */}
                <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-500"
                    style={{ width: `${Math.min(kpis.tauxRealisation, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{kpis.activitesRealisees} realisees</span>
                  <span className="font-semibold text-primary">{kpis.tauxRealisation}%</span>
                </div>
              </div>
            </TabsTrigger>

            {/* Tab Conges */}
            <TabsTrigger
              value="conges"
              className="group/tab relative overflow-hidden rounded-lg p-0 text-left shadow-none transition-all duration-300 data-[state=active]:bg-card data-[state=active]:shadow-md data-[state=active]:shadow-blue-500/10 data-[state=inactive]:hover:bg-accent/50"
            >
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-blue-500 via-blue-400 to-cyan-400 opacity-0 transition-opacity duration-300 group-data-[state=active]/tab:opacity-100" />

              <div className="relative flex flex-col gap-1.5 px-3 py-2.5 sm:px-4 sm:py-3">
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-blue-100 p-1.5 transition-all duration-300 dark:bg-blue-900/40 group-data-[state=active]/tab:bg-blue-500 group-data-[state=active]/tab:shadow-sm group-data-[state=active]/tab:shadow-blue-500/25 dark:group-data-[state=active]/tab:bg-blue-500">
                      <CalendarDays className="h-3.5 w-3.5 text-blue-600 transition-colors duration-300 dark:text-blue-400 group-data-[state=active]/tab:text-white" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold">Conges</span>
                      <p className="hidden text-[10px] text-muted-foreground sm:block">
                        Permissions et absences
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    {congesData.enAttente > 0 ? (
                      <span className="relative flex h-5 min-w-5 items-center justify-center">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-30" />
                        <span className="relative flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                          {congesData.enAttente}
                        </span>
                      </span>
                    ) : (
                      <span className="text-base font-bold text-blue-600 dark:text-blue-400 sm:text-lg">
                        {congesData.approuves}
                      </span>
                    )}
                  </div>
                </div>
                {/* Conge stats mini bar */}
                <div className="flex gap-1">
                  <div className="flex flex-1 items-center justify-center gap-1 rounded bg-emerald-50 py-0.5 dark:bg-emerald-900/20">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">{congesData.approuves}</span>
                  </div>
                  <div className="flex flex-1 items-center justify-center gap-1 rounded bg-amber-50 py-0.5 dark:bg-amber-900/20">
                    <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    <span className="text-[10px] font-medium text-amber-700 dark:text-amber-400">{congesData.enAttente}</span>
                  </div>
                  <div className="flex flex-1 items-center justify-center gap-1 rounded bg-red-50 py-0.5 dark:bg-red-900/20">
                    <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    <span className="text-[10px] font-medium text-red-700 dark:text-red-400">{congesData.refuses}</span>
                  </div>
                </div>
              </div>
            </TabsTrigger>

            {/* Tab Retards */}
            <TabsTrigger
              value="retards"
              className="group/tab relative overflow-hidden rounded-lg p-0 text-left shadow-none transition-all duration-300 data-[state=active]:bg-card data-[state=active]:shadow-md data-[state=active]:shadow-amber-500/10 data-[state=inactive]:hover:bg-accent/50"
            >
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-amber-500 via-orange-400 to-red-400 opacity-0 transition-opacity duration-300 group-data-[state=active]/tab:opacity-100" />

              <div className="relative flex flex-col gap-1.5 px-3 py-2.5 sm:px-4 sm:py-3">
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-amber-100 p-1.5 transition-all duration-300 dark:bg-amber-900/40 group-data-[state=active]/tab:bg-amber-500 group-data-[state=active]/tab:shadow-sm group-data-[state=active]/tab:shadow-amber-500/25 dark:group-data-[state=active]/tab:bg-amber-500">
                      <AlarmClockCheck className="h-3.5 w-3.5 text-amber-600 transition-colors duration-300 dark:text-amber-400 group-data-[state=active]/tab:text-white" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold">Retards</span>
                      <p className="hidden text-[10px] text-muted-foreground sm:block">
                        Ponctualite et presence
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    {retardsData.totalRetardsMois > 0 ? (
                      <span className="text-base font-bold text-amber-600 dark:text-amber-400 sm:text-lg">
                        {retardsData.totalRetardsMois}
                      </span>
                    ) : (
                      <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 sm:text-lg">0</span>
                    )}
                  </div>
                </div>
                {/* Retards + Absences mini stats */}
                <div className="flex gap-1">
                  <div className="flex flex-1 items-center justify-center gap-1 rounded bg-amber-50 py-0.5 dark:bg-amber-900/20">
                    <Timer className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400" />
                    <span className="text-[10px] font-medium text-amber-700 dark:text-amber-400">{retardsData.totalRetardMinutes}min</span>
                  </div>
                  <div className="flex flex-1 items-center justify-center gap-1 rounded bg-red-50 py-0.5 dark:bg-red-900/20">
                    <UserX className="h-2.5 w-2.5 text-red-600 dark:text-red-400" />
                    <span className="text-[10px] font-medium text-red-700 dark:text-red-400">{retardsData.totalAbsencesMois} abs</span>
                  </div>
                </div>
              </div>
            </TabsTrigger>
          </TabsList>

        {/* TAB: Activites */}
        <TabsContent value="activites" className="space-y-5">
          <DashboardCharts
            activitesByStatus={data.activitesByStatus}
            recommandationsByStatus={data.recommandationsByStatus}
            activitesByMonth={data.activitesByMonth}
            performanceByAntenne={
              role === "SUPER_ADMIN" ? data.performanceByAntenne : undefined
            }
          />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <RecentActivitesCard
              activites={data.recentActivites}
              isEmployee={isEmployee}
            />
            <RecentRecommandationsCard
              recommandations={data.recentRecommandations}
            />
          </div>
        </TabsContent>

        {/* TAB: Conges */}
        <TabsContent value="conges" className="space-y-5">
          {/* Conges KPI row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="En attente"
              value={congesData.enAttente}
              description="Demandes a traiter"
              icon={FileClock}
              variant={congesData.enAttente > 0 ? "warning" : "default"}
            />
            <StatCard
              title="Approuves"
              value={congesData.approuves}
              description="Cette annee"
              icon={FileCheck2}
              variant="success"
            />
            <StatCard
              title="Refuses"
              value={congesData.refuses}
              description="Cette annee"
              icon={FileX2}
              variant={congesData.refuses > 0 ? "danger" : "default"}
            />
            <StatCard
              title="Jours utilises"
              value={congesData.totalJoursUtilises}
              description="Jours de conges pris"
              icon={CalendarDays}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Conges by type chart */}
            <Card className="overflow-hidden border-0 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-primary/10 p-1.5">
                    <BarChart3 className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="text-sm font-semibold">
                    Conges par type
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {congesData.congesByType.length > 0 ? (
                  <div className="flex items-center">
                    <ResponsiveContainer width="60%" height={220}>
                      <PieChart>
                        <Pie
                          data={congesData.congesByType}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                          nameKey="name"
                          strokeWidth={0}
                          label={(props) => {
                            const { value, cx, cy, midAngle, outerRadius: or } = props as { value: number; cx: number; cy: number; midAngle: number; outerRadius: number };
                            const RADIAN = Math.PI / 180;
                            const r = or + 14;
                            const x = cx + r * Math.cos(-midAngle * RADIAN);
                            const y = cy + r * Math.sin(-midAngle * RADIAN);
                            return value > 0 ? (
                              <text x={x} y={y} textAnchor="middle" dominantBaseline="central" style={{ fontSize: 11, fontWeight: 700, fill: "hsl(var(--foreground))" }}>
                                {value}
                              </text>
                            ) : null;
                          }}
                        >
                          {congesData.congesByType.map((_: ChartDataPoint, index: number) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={PIE_COLORS[index % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex w-[40%] flex-col gap-2">
                      {congesData.congesByType.map((entry: ChartDataPoint, index: number) => (
                        <div key={entry.name} className="flex items-center gap-2 text-sm">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{
                              backgroundColor:
                                PIE_COLORS[index % PIE_COLORS.length],
                            }}
                          />
                          <span className="truncate text-xs text-muted-foreground">
                            {TYPE_CONGE_LABELS[entry.name] ?? entry.name}
                          </span>
                          <span className="ml-auto text-xs font-semibold">
                            {entry.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <EmptyState text="Aucun conge approuve cette annee" />
                )}
              </CardContent>
            </Card>

            {/* Recent conges list */}
            <Card className="overflow-hidden border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-primary/10 p-1.5">
                    <CalendarDays className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="text-sm font-semibold">
                    Dernieres demandes
                  </CardTitle>
                </div>
                <Link
                  href="/conges"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  Tout voir <ArrowRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent>
                {congesData.recentConges.length > 0 ? (
                  <div className="space-y-2.5">
                    {congesData.recentConges.map((c: CongeItem) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">
                            {isManager
                              ? `${c.employePrenom} ${c.employeNom}`
                              : TYPE_CONGE_LABELS[c.type] ?? c.type}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {isManager && (
                              <span>{TYPE_CONGE_LABELS[c.type] ?? c.type} &middot; </span>
                            )}
                            {c.nbJours}j &middot; {formatDateFr(c.dateDebut)} - {formatDateFr(c.dateFin)}
                          </p>
                        </div>
                        <StatusBadge
                          status={c.statut}
                          label={STATUT_CONGE_LABELS[c.statut] ?? c.statut}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState text="Aucune demande de conge" />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB: Retards */}
        <TabsContent value="retards" className="space-y-5">
          {/* Retards KPIs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Retards ce mois"
              value={retardsData.totalRetardsMois}
              description="Nombre de pointages en retard"
              icon={Timer}
              variant={retardsData.totalRetardsMois > 0 ? "warning" : "default"}
            />
            <StatCard
              title="Minutes cumulees"
              value={`${retardsData.totalRetardMinutes} min`}
              description="Total retard ce mois"
              icon={Clock}
              variant={retardsData.totalRetardMinutes > 30 ? "danger" : "default"}
            />
            <StatCard
              title="Absences ce mois"
              value={retardsData.totalAbsencesMois}
              description="Jours marques absent"
              icon={UserX}
              variant={retardsData.totalAbsencesMois > 0 ? "danger" : "default"}
            />
            {isManager ? (
              <StatCard
                title="Employes concernes"
                value={retardsData.employesAvecRetard}
                description="Avec au moins 1 retard"
                icon={Users}
              />
            ) : (
              <StatCard
                title="Recommandations en retard"
                value={kpis.recommandationsEnRetard}
                description="En depassement d'echeance"
                icon={AlertTriangle}
                variant={kpis.recommandationsEnRetard > 0 ? "danger" : "default"}
              />
            )}
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Retards by day of week chart */}
            <Card className="overflow-hidden border-0 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-amber-100 p-1.5 dark:bg-amber-900/40">
                    <BarChart3 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">
                      Retards par jour
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">Ce mois-ci</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {retardsData.retardsByDay.some((d: ChartDataPoint) => d.value > 0) ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={retardsData.retardsByDay} barCategoryGap="25%">
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--accent))" }} />
                      <Bar
                        dataKey="value"
                        name="Retards"
                        fill="hsl(var(--chart-4))"
                        radius={[6, 6, 0, 0]}
                      >
                        <LabelList dataKey="value" position="top" style={{ fontSize: 11, fontWeight: 600, fill: "hsl(var(--foreground))" }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState text="Aucun retard ce mois-ci" />
                )}
              </CardContent>
            </Card>

            {/* Recent retards list */}
            <Card className="overflow-hidden border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-amber-100 p-1.5 dark:bg-amber-900/40">
                    <Timer className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <CardTitle className="text-sm font-semibold">
                    Derniers retards
                  </CardTitle>
                </div>
                <Link
                  href="/pointages"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  Tout voir <ArrowRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent>
                {retardsData.recentRetards.length > 0 ? (
                  <div className="space-y-2.5">
                    {retardsData.recentRetards.map((r: RetardItem) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">
                            {isManager
                              ? `${r.employePrenom} ${r.employeNom}`
                              : formatDateFr(r.date)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {isManager && <span>{formatDateFr(r.date)} &middot; </span>}
                            {r.antenneNom && <span>{r.antenneNom} &middot; </span>}
                            <span className="font-medium text-amber-600 dark:text-amber-400">
                              +{r.retardMinutes} min
                            </span>
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                        >
                          {r.retardMinutes} min
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState text="Aucun retard enregistre" />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ======================== SUB-COMPONENTS ========================

function PointageItem({
  label,
  value,
  icon: Icon,
  colorClass,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
      <div className={`rounded-lg p-2 ${colorClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function RecentActivitesCard({
  activites,
  isEmployee,
}: {
  activites: DashboardData["recentActivites"];
  isEmployee: boolean;
}) {
  return (
    <Card className="overflow-hidden border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-1.5">
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-sm font-semibold">
            {isEmployee ? "Mes activites recentes" : "Activites recentes"}
          </CardTitle>
        </div>
        <Link
          href="/activites"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Tout voir <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent>
        {activites.length > 0 ? (
          <div className="space-y-2.5">
            {activites.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.titre}</p>
                  {a.projetNom && (
                    <p className="text-xs text-muted-foreground">{a.projetNom}</p>
                  )}
                </div>
                <div className="ml-3 flex items-center gap-2">
                  <StatusBadge
                    status={a.statut}
                    label={STATUT_ACTIVITE_LABELS[a.statut]}
                  />
                  <span className="hidden text-xs text-muted-foreground sm:inline">
                    {formatDateFr(a.dateFin)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState text="Aucune activite recente" />
        )}
      </CardContent>
    </Card>
  );
}

function RecentRecommandationsCard({
  recommandations,
}: {
  recommandations: DashboardData["recentRecommandations"];
}) {
  return (
    <Card className="overflow-hidden border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-red-100 p-1.5 dark:bg-red-900/40">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-sm font-semibold">
            Recommandations en retard
          </CardTitle>
        </div>
        <Link
          href="/recommandations"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Tout voir <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent>
        {recommandations.length > 0 ? (
          <div className="space-y-2.5">
            {recommandations.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.titre}</p>
                  {r.antenneNom && (
                    <p className="text-xs text-muted-foreground">{r.antenneNom}</p>
                  )}
                </div>
                <div className="ml-3 flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={
                      r.priorite === "HAUTE"
                        ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400"
                        : r.priorite === "MOYENNE"
                          ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                    }
                  >
                    {PRIORITE_LABELS[r.priorite] ?? r.priorite}
                  </Badge>
                  <span className="hidden text-xs text-muted-foreground sm:inline">
                    {formatDateFr(r.dateEcheance)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState text="Aucune recommandation en retard" />
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-32 items-center justify-center">
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
