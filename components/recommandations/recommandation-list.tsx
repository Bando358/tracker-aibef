"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import type {
  StatutRecommandationType,
  PrioriteType,
  SourceRecommandationType,
} from "@/types";
import {
  getAllRecommandations,
  deleteRecommandation,
} from "@/lib/actions/recommandation.actions";
import {
  STATUT_RECOMMANDATION_LABELS,
  PRIORITE_LABELS,
  PAGINATION_DEFAULT,
} from "@/lib/constants";
import { formatDateFr } from "@/lib/date-utils";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Plus,
  MoreHorizontal,
  Eye,
  RefreshCw,
  Trash2,
} from "lucide-react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RecommandationRow {
  id: string;
  titre: string;
  source: SourceRecommandationType;
  priorite: PrioriteType;
  statut: StatutRecommandationType;
  dateEcheance: Date;
  responsables: {
    id: string;
    isPrincipal: boolean;
    user: { id: string; nom: string; prenom: string };
  }[];
  antenne: { id: string; nom: string } | null;
}

interface RecommandationListProps {
  initialData?: RecommandationRow[];
  initialTotal?: number;
}

// ---------------------------------------------------------------------------
// Filter constants
// ---------------------------------------------------------------------------

const STATUS_TABS: {
  value: StatutRecommandationType | "ALL";
  label: string;
}[] = [
  { value: "ALL", label: "Toutes" },
  { value: "EN_ATTENTE", label: "En attente" },
  { value: "EN_COURS", label: "En cours" },
  { value: "EN_RETARD", label: "En retard" },
  { value: "RESOLUE", label: "Resolues" },
];

const SOURCE_LABELS: Record<SourceRecommandationType, string> = {
  ACTIVITE: "Activite",
  REUNION: "Reunion",
  SUPERVISION: "Supervision",
  FORMATION: "Formation",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RecommandationList({
  initialData,
  initialTotal,
}: RecommandationListProps) {
  const router = useRouter();

  const [data, setData] = useState<RecommandationRow[]>(initialData ?? []);
  const [total, setTotal] = useState(initialTotal ?? 0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGINATION_DEFAULT);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(!initialData);

  // Filters
  const [activeStatut, setActiveStatut] = useState<
    StatutRecommandationType | "ALL"
  >("ALL");
  const [filterPriorite, setFilterPriorite] = useState<PrioriteType | "ALL">(
    "ALL"
  );
  const [filterSource, setFilterSource] = useState<
    SourceRecommandationType | "ALL"
  >("ALL");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, unknown> = {
        page,
        pageSize,
        search: search || undefined,
      };
      if (activeStatut !== "ALL") params.statut = activeStatut;
      if (filterPriorite !== "ALL") params.priorite = filterPriorite;
      if (filterSource !== "ALL") params.source = filterSource;

      const result = await getAllRecommandations(
        params as Parameters<typeof getAllRecommandations>[0]
      );
      setData(result.data as unknown as RecommandationRow[]);
      setTotal(result.total);
    } catch {
      toast.error("Erreur lors du chargement des recommandations");
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search, activeStatut, filterPriorite, filterSource]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleDelete(id: string) {
    const result = await deleteRecommandation(id);
    if (result.success) {
      toast.success("Recommandation supprimee avec succes");
      fetchData();
    } else {
      toast.error(result.error);
    }
  }

  function handleStatusTabChange(value: string) {
    setActiveStatut(value as StatutRecommandationType | "ALL");
    setPage(1);
  }

  // ---------------------------------------------------------------------------
  // Columns
  // ---------------------------------------------------------------------------

  const columns: ColumnDef<RecommandationRow>[] = [
    {
      accessorKey: "titre",
      header: "Titre",
      cell: ({ row }) => (
        <Link
          href={`/recommandations/${row.original.id}`}
          className="font-medium hover:underline"
        >
          {row.original.titre}
        </Link>
      ),
    },
    {
      accessorKey: "source",
      header: "Source",
      cell: ({ row }) => SOURCE_LABELS[row.original.source] ?? row.original.source,
    },
    {
      accessorKey: "priorite",
      header: "Priorite",
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.priorite}
          label={PRIORITE_LABELS[row.original.priorite]}
        />
      ),
    },
    {
      accessorKey: "statut",
      header: "Statut",
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.statut}
          label={STATUT_RECOMMANDATION_LABELS[row.original.statut]}
        />
      ),
    },
    {
      accessorKey: "dateEcheance",
      header: "Echeance",
      cell: ({ row }) => formatDateFr(row.original.dateEcheance),
    },
    {
      accessorKey: "antenne",
      header: "Antenne",
      cell: ({ row }) => row.original.antenne?.nom ?? "-",
    },
    {
      id: "responsablesCount",
      header: "Responsables",
      cell: ({ row }) => {
        const count = row.original.responsables.length;
        return (
          <span className="text-sm text-muted-foreground">
            {count} responsable{count > 1 ? "s" : ""}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() =>
                router.push(`/recommandations/${row.original.id}`)
              }
            >
              <Eye className="mr-2 h-4 w-4" />
              Voir
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                router.push(`/recommandations/${row.original.id}`)
              }
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Modifier le statut
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <ConfirmDialog
              trigger={
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </DropdownMenuItem>
              }
              title="Supprimer la recommandation"
              description={`Etes-vous sur de vouloir supprimer la recommandation "${row.original.titre}" ? Cette action est irreversible.`}
              confirmLabel="Supprimer"
              onConfirm={() => handleDelete(row.original.id)}
              variant="destructive"
            />
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Recommandations
          </h1>
          <p className="text-muted-foreground">
            Gerez et suivez les recommandations issues des activites.
          </p>
        </div>
        <Button asChild>
          <Link href="/recommandations/nouvelle">
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle recommandation
          </Link>
        </Button>
      </div>

      {/* Status tabs */}
      <Tabs
        value={activeStatut}
        onValueChange={handleStatusTabChange}
      >
        <TabsList>
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Additional filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={filterPriorite}
          onValueChange={(v) => {
            setFilterPriorite(v as PrioriteType | "ALL");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Priorite" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Toutes priorites</SelectItem>
            <SelectItem value="HAUTE">Haute</SelectItem>
            <SelectItem value="MOYENNE">Moyenne</SelectItem>
            <SelectItem value="BASSE">Basse</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filterSource}
          onValueChange={(v) => {
            setFilterSource(v as SourceRecommandationType | "ALL");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Toutes sources</SelectItem>
            {Object.entries(SOURCE_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={data}
        searchPlaceholder="Rechercher une recommandation..."
        onSearch={(value) => {
          setSearch(value);
          setPage(1);
        }}
        pagination={{
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        }}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        isLoading={isLoading}
      />
    </div>
  );
}
