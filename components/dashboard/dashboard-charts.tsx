"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  LabelList,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import Image from "next/image";
import { BarChart3, PieChart as PieChartIcon, TrendingUp } from "lucide-react";

function LogoIcon({ className }: { className?: string }) {
  return <Image src="/logo-tracker.png" alt="" width={16} height={16} className={className} />;
}
import type { ChartDataPoint } from "@/types";

const STATUS_COLORS: Record<string, string> = {
  PLANIFIEE: "hsl(var(--chart-1))",
  EN_COURS: "hsl(var(--chart-4))",
  REALISEE: "hsl(var(--chart-2))",
  EN_RETARD: "hsl(var(--destructive))",
  ANNULEE: "hsl(var(--muted-foreground))",
  REPROGRAMMEE: "hsl(var(--chart-5))",
  EN_ATTENTE: "hsl(var(--chart-3))",
  PARTIELLEMENT_REALISEE: "hsl(var(--chart-5))",
  RESOLUE: "hsl(var(--chart-2))",
};

const PIE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--primary))",
  "hsl(var(--muted-foreground))",
];

function getColor(dataPoint: ChartDataPoint, index: number): string {
  const statut = dataPoint.statut as string | undefined;
  if (statut && STATUS_COLORS[statut]) {
    return STATUS_COLORS[statut];
  }
  return PIE_COLORS[index % PIE_COLORS.length];
}

const tooltipStyle = {
  borderRadius: "12px",
  border: "1px solid hsl(var(--border) / 0.5)",
  backgroundColor: "hsl(var(--card))",
  boxShadow: "0 8px 32px -8px hsl(var(--foreground) / 0.12)",
  padding: "10px 14px",
  color: "hsl(var(--foreground))",
  fontSize: "13px",
};

interface DashboardChartsProps {
  activitesByStatus: ChartDataPoint[];
  recommandationsByStatus: ChartDataPoint[];
  activitesByMonth: ChartDataPoint[];
  performanceByAntenne?: ChartDataPoint[];
}

function ChartCard({
  icon: Icon,
  iconBg = "bg-white dark:bg-slate-800 shadow-sm",
  iconColor = "text-primary",
  cardBg = "bg-gradient-to-br from-slate-50/80 to-white border-border/60 dark:from-slate-900/40 dark:to-slate-800/30 dark:border-slate-700/40",
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconBg?: string;
  iconColor?: string;
  cardBg?: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={`group overflow-hidden border shadow-sm transition-all duration-300 hover:shadow-md ${cardBg}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className={`rounded-xl p-2 ${iconBg} transition-transform duration-300 group-hover:scale-110`}>
            <Icon className={`h-4 w-4 ${iconColor}`} />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
            <CardDescription className="text-xs">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">{children}</CardContent>
    </Card>
  );
}

export function DashboardCharts({
  activitesByStatus,
  recommandationsByStatus,
  activitesByMonth,
  performanceByAntenne,
}: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 stagger">
      {/* 1. Bar chart: Activites par statut */}
      <ChartCard
        icon={BarChart3}
        iconBg="bg-white dark:bg-orange-900/50 shadow-sm"
        iconColor="text-orange-600 dark:text-orange-400"
        cardBg="bg-gradient-to-br from-orange-50/60 to-amber-50/40 border-orange-200/50 dark:from-orange-950/30 dark:to-amber-950/20 dark:border-orange-800/30"
        title="Activites par statut"
        description="Repartition actuelle"
      >
        {activitesByStatus.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={activitesByStatus} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--accent))", radius: 8 }} />
              <Bar dataKey="value" name="Nombre" radius={[8, 8, 0, 0]}>
                {activitesByStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getColor(entry, index)} />
                ))}
                <LabelList dataKey="value" position="top" style={{ fontSize: 11, fontWeight: 600, fill: "hsl(var(--foreground))" }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChartState />
        )}
      </ChartCard>

      {/* 2. Donut chart: Recommandations par statut */}
      <ChartCard
        icon={PieChartIcon}
        iconBg="bg-white dark:bg-indigo-900/50 shadow-sm"
        iconColor="text-indigo-600 dark:text-indigo-400"
        cardBg="bg-gradient-to-br from-indigo-50/60 to-violet-50/40 border-indigo-200/50 dark:from-indigo-950/30 dark:to-violet-950/20 dark:border-indigo-800/30"
        title="Recommandations par statut"
        description="Vue d'ensemble"
      >
        {recommandationsByStatus.length > 0 ? (
          <div className="flex items-center">
            <ResponsiveContainer width="60%" height={280}>
              <PieChart>
                <Pie
                  data={recommandationsByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                  strokeWidth={0}
                  label={(props) => {
                    const { value, cx, cy, midAngle, outerRadius: or } = props as { value: number; cx: number; cy: number; midAngle: number; outerRadius: number };
                    const RADIAN = Math.PI / 180;
                    const r = or + 16;
                    const x = cx + r * Math.cos(-midAngle * RADIAN);
                    const y = cy + r * Math.sin(-midAngle * RADIAN);
                    return value > 0 ? (
                      <text x={x} y={y} textAnchor="middle" dominantBaseline="central" style={{ fontSize: 11, fontWeight: 700, fill: "hsl(var(--foreground))" }}>
                        {value}
                      </text>
                    ) : null;
                  }}
                >
                  {recommandationsByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getColor(entry, index)} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex w-[40%] flex-col gap-2.5">
              {recommandationsByStatus.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2.5">
                  <div
                    className="h-3 w-3 rounded-full shadow-sm"
                    style={{ backgroundColor: getColor(entry, index) }}
                  />
                  <span className="flex-1 truncate text-xs text-muted-foreground">
                    {entry.name}
                  </span>
                  <span className="text-xs font-bold tabular-nums">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyChartState />
        )}
      </ChartCard>

      {/* 3. Area chart: Evolution mensuelle */}
      <ChartCard
        icon={TrendingUp}
        iconBg="bg-white dark:bg-emerald-900/50 shadow-sm"
        iconColor="text-emerald-600 dark:text-emerald-400"
        cardBg="bg-gradient-to-br from-emerald-50/60 to-teal-50/40 border-emerald-200/50 dark:from-emerald-950/30 dark:to-teal-950/20 dark:border-emerald-800/30"
        title="Evolution mensuelle"
        description="Activites sur 12 mois"
      >
        {activitesByMonth.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={activitesByMonth}>
              <defs>
                <linearGradient id="colorActivites" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                angle={-35}
                textAnchor="end"
                height={50}
              />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area
                type="monotone"
                dataKey="value"
                name="Activites"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                fill="url(#colorActivites)"
                dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "hsl(var(--background))" }}
                activeDot={{ r: 6, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "hsl(var(--background))" }}
              >
                <LabelList dataKey="value" position="top" offset={10} style={{ fontSize: 10, fontWeight: 600, fill: "hsl(var(--foreground))" }} />
              </Area>
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChartState />
        )}
      </ChartCard>

      {/* 4. Horizontal bar: Performance par antenne */}
      {performanceByAntenne && performanceByAntenne.length > 0 && (
        <ChartCard
          icon={LogoIcon}
          iconBg="bg-white dark:bg-teal-900/50 shadow-sm"
          iconColor="text-teal-600 dark:text-teal-400"
          cardBg="bg-gradient-to-br from-teal-50/60 to-cyan-50/40 border-teal-200/50 dark:from-teal-950/30 dark:to-cyan-950/20 dark:border-teal-800/30"
          title="Performance par antenne"
          description="Nombre d'activites"
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={performanceByAntenne} layout="vertical" barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={110} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--accent))", radius: 8 }} />
              <Bar dataKey="value" name="Activites" fill="hsl(var(--primary))" radius={[0, 8, 8, 0]}>
                <LabelList dataKey="value" position="right" style={{ fontSize: 11, fontWeight: 600, fill: "hsl(var(--foreground))" }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  );
}

function EmptyChartState() {
  return (
    <div className="flex h-[280px] flex-col items-center justify-center gap-3 text-muted-foreground">
      <div className="rounded-2xl bg-muted/50 p-4">
        <BarChart3 className="h-8 w-8 opacity-30" />
      </div>
      <p className="text-sm font-medium">Aucune donnee disponible</p>
    </div>
  );
}
