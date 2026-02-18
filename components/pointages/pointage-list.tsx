"use client";

import { useState, useEffect, useCallback } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getPointagesByUser, getPointageSummary } from "@/lib/actions/pointage.actions";
import { formatDateFr, formatTimeFr, getMonthName } from "@/lib/date-utils";
import {
  CalendarDays,
  UserCheck,
  UserX,
  Clock,
  Timer,
} from "lucide-react";
import type { StatutPointageType } from "@/types";

interface Pointage {
  id: string;
  date: Date;
  heureArrivee: Date | null;
  heureDepart: Date | null;
  statut: StatutPointageType;
  retardMinutes: number;
  heuresSupp: number;
  observations: string | null;
}

interface PointageListProps {
  userId: string;
  initialMonth?: number;
  initialYear?: number;
}

interface MonthSummary {
  presents: number;
  absents: number;
  retards: number;
  totalRetardMinutes: number;
  totalHeuresSupp: number;
}

const columns: ColumnDef<Pointage>[] = [
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => formatDateFr(row.original.date),
  },
  {
    accessorKey: "heureArrivee",
    header: "Arrivee",
    cell: ({ row }) =>
      row.original.heureArrivee
        ? formatTimeFr(row.original.heureArrivee)
        : "-",
  },
  {
    accessorKey: "heureDepart",
    header: "Depart",
    cell: ({ row }) =>
      row.original.heureDepart
        ? formatTimeFr(row.original.heureDepart)
        : "-",
  },
  {
    accessorKey: "statut",
    header: "Statut",
    cell: ({ row }) => <StatusBadge status={row.original.statut} />,
  },
  {
    accessorKey: "retardMinutes",
    header: "Retard (min)",
    cell: ({ row }) =>
      row.original.retardMinutes > 0 ? (
        <span className="text-amber-600 font-medium">
          {row.original.retardMinutes} min
        </span>
      ) : (
        "-"
      ),
  },
  {
    accessorKey: "heuresSupp",
    header: "Heures Sup",
    cell: ({ row }) =>
      row.original.heuresSupp > 0 ? (
        <span className="text-blue-600 font-medium">
          {row.original.heuresSupp}h
        </span>
      ) : (
        "-"
      ),
  },
  {
    accessorKey: "observations",
    header: "Observations",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
        {row.original.observations ?? "-"}
      </span>
    ),
  },
];

export function PointageList({
  userId,
  initialMonth,
  initialYear,
}: PointageListProps) {
  const now = new Date();
  const [month, setMonth] = useState(initialMonth ?? now.getMonth());
  const [year, setYear] = useState(initialYear ?? now.getFullYear());
  const [pointages, setPointages] = useState<Pointage[]>([]);
  const [summary, setSummary] = useState<MonthSummary>({
    presents: 0,
    absents: 0,
    retards: 0,
    totalRetardMinutes: 0,
    totalHeuresSupp: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [pointageResult, summaryResult] = await Promise.all([
        getPointagesByUser(userId, month, year, pagination.page, pagination.pageSize),
        getPointageSummary(userId, month, year),
      ]);

      setPointages(pointageResult.data as Pointage[]);
      setPagination({
        page: pointageResult.page,
        pageSize: pointageResult.pageSize,
        total: pointageResult.total,
        totalPages: pointageResult.totalPages,
      });
      setSummary(summaryResult);
    } catch {
      // Errors handled silently; empty state shown
    } finally {
      setIsLoading(false);
    }
  }, [userId, month, year, pagination.page, pagination.pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Generer les annees disponibles
  const currentYear = now.getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div className="space-y-6">
      {/* Cartes de resume */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Presents</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {summary.presents}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Absents</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {summary.absents}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Retards</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {summary.retards}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total retard
            </CardTitle>
            <Timer className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {summary.totalRetardMinutes} min
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Heures Sup
            </CardTitle>
            <CalendarDays className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {summary.totalHeuresSupp}h
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selecteurs mois/annee */}
      <div className="flex items-center gap-4">
        <Select
          value={String(month)}
          onValueChange={(v) => {
            setMonth(Number(v));
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Mois" />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m} value={String(m)}>
                {getMonthName(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={String(year)}
          onValueChange={(v) => {
            setYear(Number(v));
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Annee" />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tableau des pointages */}
      <DataTable
        columns={columns}
        data={pointages}
        isLoading={isLoading}
        pagination={pagination}
        onPageChange={(page) =>
          setPagination((prev) => ({ ...prev, page }))
        }
        onPageSizeChange={(pageSize) =>
          setPagination((prev) => ({ ...prev, page: 1, pageSize }))
        }
      />
    </div>
  );
}
