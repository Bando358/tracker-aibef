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
import { BarChart3, PieChart as PieChartIcon, TrendingUp, Building2 } from "lucide-react";
import type { ChartDataPoint } from "@/types";

// ======================== COLORS ========================

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

// ======================== TOOLTIP ========================

const tooltipStyle = {
  borderRadius: "12px",
  border: "none",
  backgroundColor: "hsl(var(--card))",
  boxShadow: "0 10px 40px -10px hsl(var(--foreground) / 0.15)",
  padding: "8px 12px",
  color: "hsl(var(--foreground))",
};

// ======================== PROPS ========================

interface DashboardChartsProps {
  activitesByStatus: ChartDataPoint[];
  recommandationsByStatus: ChartDataPoint[];
  activitesByMonth: ChartDataPoint[];
  performanceByAntenne?: ChartDataPoint[];
}

// ======================== COMPONENT ========================

export function DashboardCharts({
  activitesByStatus,
  recommandationsByStatus,
  activitesByMonth,
  performanceByAntenne,
}: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {/* 1. Bar chart: Activites par statut */}
      <Card className="overflow-hidden border-0 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-1.5">
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Activites par statut</CardTitle>
              <CardDescription className="text-xs">Repartition actuelle</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {activitesByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={activitesByStatus} barCategoryGap="20%">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
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
                <Bar dataKey="value" name="Nombre" radius={[6, 6, 0, 0]}>
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
        </CardContent>
      </Card>

      {/* 2. Donut chart: Recommandations par statut */}
      <Card className="overflow-hidden border-0 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-1.5">
              <PieChartIcon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Recommandations par statut</CardTitle>
              <CardDescription className="text-xs">Vue d&apos;ensemble</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
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
              <div className="flex w-[40%] flex-col gap-2">
                {recommandationsByStatus.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2 text-sm">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: getColor(entry, index) }}
                    />
                    <span className="truncate text-xs text-muted-foreground">
                      {entry.name}
                    </span>
                    <span className="ml-auto font-semibold text-xs">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyChartState />
          )}
        </CardContent>
      </Card>

      {/* 3. Area chart: Evolution mensuelle */}
      <Card className="overflow-hidden border-0 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-1.5">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Evolution mensuelle</CardTitle>
              <CardDescription className="text-xs">Activites sur 12 mois</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {activitesByMonth.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={activitesByMonth}>
                <defs>
                  <linearGradient id="colorActivites" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  angle={-35}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
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
        </CardContent>
      </Card>

      {/* 4. Horizontal bar: Performance par antenne */}
      {performanceByAntenne && performanceByAntenne.length > 0 && (
        <Card className="overflow-hidden border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-1.5">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Performance par antenne</CardTitle>
                <CardDescription className="text-xs">Nombre d&apos;activites</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={performanceByAntenne} layout="vertical" barCategoryGap="25%">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  width={110}
                />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--accent))" }} />
                <Bar
                  dataKey="value"
                  name="Activites"
                  fill="hsl(var(--primary))"
                  radius={[0, 6, 6, 0]}
                >
                  <LabelList dataKey="value" position="right" style={{ fontSize: 11, fontWeight: 600, fill: "hsl(var(--foreground))" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ======================== EMPTY STATE ========================

function EmptyChartState() {
  return (
    <div className="flex h-[280px] flex-col items-center justify-center gap-2 text-muted-foreground">
      <BarChart3 className="h-10 w-10 opacity-20" />
      <p className="text-sm">Aucune donnee disponible</p>
    </div>
  );
}
