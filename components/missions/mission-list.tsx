"use client";

import { useState, useTransition, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Eye, Pencil, Trash2, MoreHorizontal } from "lucide-react";

import { getAllMissions, deleteMission } from "@/lib/actions/mission.actions";
import { formatDateFr } from "@/lib/date-utils";
import { STATUT_MISSION_LABELS, ROLE_LABELS } from "@/lib/constants";
import type { PaginatedResult } from "@/types";

import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type MissionRow = {
  id: string;
  objet: string;
  lieu: string;
  dateDebut: Date;
  dateFin: Date;
  perDiem: number | null;
  statut: string;
  responsable: { id: string; nom: string; prenom: string };
  createur: { id: string; nom: string; prenom: string };
};

interface MissionListProps {
  initialData: PaginatedResult<MissionRow>;
}

type StatutMissionType = "PLANIFIEE" | "EN_COURS" | "TERMINEE" | "ANNULEE";

const TABS: Array<{ value: string; label: string; statut?: StatutMissionType }> = [
  { value: "all", label: "Toutes" },
  { value: "PLANIFIEE", label: "Planifiees", statut: "PLANIFIEE" },
  { value: "EN_COURS", label: "En cours", statut: "EN_COURS" },
  { value: "TERMINEE", label: "Terminees", statut: "TERMINEE" },
  { value: "ANNULEE", label: "Annulees", statut: "ANNULEE" },
];

export function MissionList({ initialData }: MissionListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState<PaginatedResult<MissionRow>>(initialData);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialData.pageSize);

  const fetchData = useCallback(
    (overrides?: { statut?: StatutMissionType; search?: string; page?: number; pageSize?: number }) => {
      startTransition(async () => {
        try {
          const result = await getAllMissions({
            search: overrides?.search ?? search,
            page: overrides?.page ?? page,
            pageSize: overrides?.pageSize ?? pageSize,
            statut: overrides?.statut ?? TABS.find((t) => t.value === activeTab)?.statut,
          });
          setData(result);
        } catch {
          toast.error("Erreur lors du chargement");
        }
      });
    },
    [activeTab, search, page, pageSize]
  );

  useEffect(() => { fetchData(); }, [fetchData]);

  function handleTabChange(value: string) {
    setActiveTab(value);
    setPage(1);
    const tab = TABS.find((t) => t.value === value);
    fetchData({ statut: tab?.statut, page: 1 });
  }

  async function handleDelete(id: string) {
    const result = await deleteMission(id);
    if (result.success) {
      toast.success("Mission supprimee");
      fetchData();
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  const columns: ColumnDef<MissionRow>[] = [
    {
      accessorKey: "objet",
      header: "Objet",
      cell: ({ row }) => (
        <Link href={`/missions/${row.original.id}`} className="font-medium text-primary hover:underline line-clamp-2">
          {row.original.objet}
        </Link>
      ),
    },
    {
      accessorKey: "lieu",
      header: "Lieu",
      cell: ({ row }) => <span className="text-sm">{row.original.lieu}</span>,
    },
    {
      accessorKey: "responsable",
      header: "Responsable",
      cell: ({ row }) => (
        <span className="text-sm whitespace-nowrap">
          {row.original.responsable.prenom} {row.original.responsable.nom}
        </span>
      ),
    },
    {
      accessorKey: "dateDebut",
      header: "Debut",
      cell: ({ row }) => <span className="text-sm">{formatDateFr(row.original.dateDebut)}</span>,
    },
    {
      accessorKey: "dateFin",
      header: "Fin",
      cell: ({ row }) => <span className="text-sm">{formatDateFr(row.original.dateFin)}</span>,
    },
    {
      accessorKey: "perDiem",
      header: "Per diem",
      cell: ({ row }) =>
        row.original.perDiem ? (
          <span className="text-sm tabular-nums">
            {new Intl.NumberFormat("fr-FR").format(row.original.perDiem)} F
          </span>
        ) : "-",
    },
    {
      accessorKey: "statut",
      header: "Statut",
      cell: ({ row }) => (
        <StatusBadge status={row.original.statut} label={STATUT_MISSION_LABELS[row.original.statut]} />
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/missions/${row.original.id}`}>
                <Eye className="mr-2 h-4 w-4" /> Voir
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/missions/${row.original.id}/modifier`}>
                <Pencil className="mr-2 h-4 w-4" /> Modifier
              </Link>
            </DropdownMenuItem>
            <ConfirmDialog
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                </DropdownMenuItem>
              }
              title="Supprimer la mission"
              description={`Supprimer la mission "${row.original.objet}" ?`}
              confirmLabel="Supprimer"
              variant="destructive"
              onConfirm={() => handleDelete(row.original.id)}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="flex-wrap h-auto">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="text-xs text-muted-foreground">{data.total} mission(s)</div>

      <DataTable
        columns={columns}
        data={data.data}
        searchPlaceholder="Rechercher une mission..."
        onSearch={(q) => { setSearch(q); setPage(1); }}
        pagination={{ page: data.page, pageSize: data.pageSize, total: data.total, totalPages: data.totalPages }}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        isLoading={isPending}
      />
    </div>
  );
}
