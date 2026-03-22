"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  Search,
  X,
  SlidersHorizontal,
  ArrowUpDown,
} from "lucide-react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RecommandationRow {
  id: string;
  titre: string;
  source: SourceRecommandationType;
  typeResolution: string;
  frequence: string | null;
  priorite: PrioriteType;
  statut: StatutRecommandationType;
  dateEcheance: Date;
  tauxMiseEnOeuvre: number;
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
  antennes: Array<{ id: string; nom: string }>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_TABS: {
  value: StatutRecommandationType | "ALL";
  label: string;
}[] = [
  { value: "ALL", label: "Toutes" },
  { value: "EN_ATTENTE", label: "En attente" },
  { value: "EN_COURS", label: "En cours" },
  { value: "PARTIELLEMENT_REALISEE", label: "Partielle" },
  { value: "EN_RETARD", label: "En retard" },
  { value: "RESOLUE", label: "Resolues" },
  { value: "ANNULEE", label: "Annulees" },
];

const SOURCE_LABELS: Record<string, string> = {
  ACTIVITE: "Activite",
  REUNION: "Reunion",
  SUPERVISION: "Supervision",
  FORMATION: "Formation",
};

const TYPE_RESOLUTION_LABELS: Record<string, string> = {
  PERMANENTE: "Permanente",
  PONCTUELLE: "Ponctuelle",
  PERIODIQUE: "Periodique",
};

const FREQUENCE_LABELS: Record<string, string> = {
  MENSUELLE: "Mensuelle",
  BIMENSUELLE: "Bimensuelle",
  BIMESTRIELLE: "Bimestrielle",
  TRIMESTRIELLE: "Trimestrielle",
  SEMESTRIELLE: "Semestrielle",
  ANNUELLE: "Annuelle",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RecommandationList({
  initialData,
  initialTotal,
  antennes,
}: RecommandationListProps) {
  const router = useRouter();

  const [data, setData] = useState<RecommandationRow[]>(initialData ?? []);
  const [total, setTotal] = useState(initialTotal ?? 0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGINATION_DEFAULT);
  const [isLoading, setIsLoading] = useState(!initialData);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [activeStatut, setActiveStatut] = useState<StatutRecommandationType | "ALL">("ALL");
  const [filterPriorite, setFilterPriorite] = useState<string>("");
  const [filterSource, setFilterSource] = useState<string>("");
  const [filterAntenneId, setFilterAntenneId] = useState<string>("");
  const [filterTypeResolution, setFilterTypeResolution] = useState<string>("");
  const [filterFrequence, setFilterFrequence] = useState<string>("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);

  const activeFilterCount = [
    filterPriorite,
    filterSource,
    filterAntenneId,
    filterTypeResolution,
    filterFrequence,
  ].filter(Boolean).length;

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, unknown> = {
        page,
        pageSize,
        search: search || undefined,
        sortBy,
        sortOrder,
      };
      if (activeStatut !== "ALL") params.statut = activeStatut;
      if (filterPriorite) params.priorite = filterPriorite;
      if (filterSource) params.source = filterSource;
      if (filterAntenneId) params.antenneId = filterAntenneId;
      if (filterTypeResolution) params.typeResolution = filterTypeResolution;
      if (filterFrequence) params.frequence = filterFrequence;

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
  }, [page, pageSize, search, activeStatut, filterPriorite, filterSource, filterAntenneId, filterTypeResolution, filterFrequence, sortBy, sortOrder]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleSearch(query: string) {
    setSearch(query);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
    }, 400);
  }

  function handleSort(field: string) {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  }

  function clearFilters() {
    setFilterPriorite("");
    setFilterSource("");
    setFilterAntenneId("");
    setFilterTypeResolution("");
    setFilterFrequence("");
    setSearch("");
    setActiveStatut("ALL");
    setPage(1);
  }

  async function handleDelete(id: string) {
    const result = await deleteRecommandation(id);
    if (result.success) {
      toast.success("Recommandation supprimee avec succes");
      fetchData();
    } else {
      toast.error(result.error);
    }
  }

  function SortButton({ field, label }: { field: string; label: string }) {
    const isActive = sortBy === field;
    return (
      <button className="flex items-center gap-1 group" onClick={() => handleSort(field)}>
        {label}
        <ArrowUpDown className={`h-3 w-3 transition-colors ${isActive ? "text-primary" : "text-muted-foreground/40 group-hover:text-muted-foreground"}`} />
      </button>
    );
  }

  // ---------------------------------------------------------------------------
  // Columns
  // ---------------------------------------------------------------------------

  const columns: ColumnDef<RecommandationRow>[] = [
    {
      accessorKey: "titre",
      header: () => <SortButton field="titre" label="Titre" />,
      cell: ({ row }) => (
        <Link href={`/recommandations/${row.original.id}`} className="font-medium text-primary hover:underline">
          {row.original.titre}
        </Link>
      ),
    },
    {
      accessorKey: "source",
      header: "Source",
      cell: ({ row }) => (
        <span className="text-sm">{SOURCE_LABELS[row.original.source] ?? row.original.source}</span>
      ),
    },
    {
      accessorKey: "typeResolution",
      header: "Type",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-sm">{TYPE_RESOLUTION_LABELS[row.original.typeResolution] ?? row.original.typeResolution}</span>
          {row.original.frequence && (
            <span className="text-[10px] text-muted-foreground">{FREQUENCE_LABELS[row.original.frequence] ?? row.original.frequence}</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "priorite",
      header: "Priorite",
      cell: ({ row }) => (
        <StatusBadge status={row.original.priorite} label={PRIORITE_LABELS[row.original.priorite]} />
      ),
    },
    {
      accessorKey: "statut",
      header: "Statut",
      cell: ({ row }) => (
        <StatusBadge status={row.original.statut} label={STATUT_RECOMMANDATION_LABELS[row.original.statut]} />
      ),
    },
    {
      accessorKey: "tauxMiseEnOeuvre",
      header: () => <SortButton field="tauxMiseEnOeuvre" label="Progres" />,
      cell: ({ row }) => {
        const taux = row.original.tauxMiseEnOeuvre;
        return (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${taux >= 100 ? "bg-green-500" : taux >= 50 ? "bg-blue-500" : taux > 0 ? "bg-amber-500" : "bg-muted"}`}
                style={{ width: `${Math.min(taux, 100)}%` }}
              />
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">{taux}%</span>
          </div>
        );
      },
    },
    {
      accessorKey: "dateEcheance",
      header: () => <SortButton field="dateEcheance" label="Echeance" />,
      cell: ({ row }) => {
        const isOverdue = new Date(row.original.dateEcheance) < new Date() && row.original.statut !== "RESOLUE" && row.original.statut !== "ANNULEE";
        return (
          <span className={isOverdue ? "text-red-600 font-medium" : ""}>
            {formatDateFr(row.original.dateEcheance)}
          </span>
        );
      },
    },
    {
      accessorKey: "antenne",
      header: "Antenne",
      cell: ({ row }) => (
        <span className="text-sm">{row.original.antenne?.nom ?? "—"}</span>
      ),
    },
    {
      id: "responsables",
      header: "Responsables",
      cell: ({ row }) => {
        const principal = row.original.responsables.find((r) => r.isPrincipal);
        const count = row.original.responsables.length;
        return (
          <div className="text-sm">
            {principal ? (
              <span>{principal.user.prenom} {principal.user.nom}</span>
            ) : count > 0 ? (
              <span className="text-muted-foreground">{count} responsable{count > 1 ? "s" : ""}</span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
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
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push(`/recommandations/${row.original.id}`)}>
              <Eye className="mr-2 h-4 w-4" />
              Voir
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/recommandations/${row.original.id}`)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Modifier le statut
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <ConfirmDialog
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
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
    <div className="space-y-4">
      {/* Barre de recherche + filtres */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par titre, description..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 pr-8"
          />
          {search && (
            <button
              onClick={() => handleSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Filtres
                {activeFilterCount > 0 && (
                  <Badge className="h-5 min-w-5 rounded-full px-1.5 text-[10px]">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">Filtres avances</h4>
                  {activeFilterCount > 0 && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={clearFilters}>
                      <X className="mr-1 h-3 w-3" />
                      Reinitialiser
                    </Button>
                  )}
                </div>

                {/* Priorite */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Priorite</label>
                  <Select value={filterPriorite || "__all__"} onValueChange={(v) => { setFilterPriorite(v === "__all__" ? "" : v); setPage(1); }}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Toutes</SelectItem>
                      <SelectItem value="HAUTE">Haute</SelectItem>
                      <SelectItem value="MOYENNE">Moyenne</SelectItem>
                      <SelectItem value="BASSE">Basse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Source */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Source</label>
                  <Select value={filterSource || "__all__"} onValueChange={(v) => { setFilterSource(v === "__all__" ? "" : v); setPage(1); }}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Toutes</SelectItem>
                      {Object.entries(SOURCE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Type de resolution */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Type de resolution</label>
                  <Select value={filterTypeResolution || "__all__"} onValueChange={(v) => { setFilterTypeResolution(v === "__all__" ? "" : v); setPage(1); }}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Tous</SelectItem>
                      {Object.entries(TYPE_RESOLUTION_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Frequence */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Frequence de revision</label>
                  <Select value={filterFrequence || "__all__"} onValueChange={(v) => { setFilterFrequence(v === "__all__" ? "" : v); setPage(1); }}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Toutes</SelectItem>
                      {Object.entries(FREQUENCE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Antenne */}
                {antennes.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Antenne</label>
                    <Select value={filterAntenneId || "__all__"} onValueChange={(v) => { setFilterAntenneId(v === "__all__" ? "" : v); setPage(1); }}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Toutes</SelectItem>
                        {antennes.map((a) => (
                          <SelectItem key={a.id} value={a.id}>{a.nom}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          <Button asChild size="sm" className="gap-1.5">
            <Link href="/recommandations/nouvelle">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nouvelle</span>
            </Link>
          </Button>

          <span className="text-xs text-muted-foreground whitespace-nowrap">{total} resultat(s)</span>
        </div>
      </div>

      {/* Status tabs */}
      <Tabs value={activeStatut} onValueChange={(v) => { setActiveStatut(v as StatutRecommandationType | "ALL"); setPage(1); }}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="text-xs">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Active filters */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Filtres :</span>
          {filterPriorite && (
            <Badge variant="secondary" className="gap-1 text-xs">
              Priorite: {PRIORITE_LABELS[filterPriorite] ?? filterPriorite}
              <button onClick={() => { setFilterPriorite(""); setPage(1); }}><X className="h-3 w-3" /></button>
            </Badge>
          )}
          {filterSource && (
            <Badge variant="secondary" className="gap-1 text-xs">
              Source: {SOURCE_LABELS[filterSource] ?? filterSource}
              <button onClick={() => { setFilterSource(""); setPage(1); }}><X className="h-3 w-3" /></button>
            </Badge>
          )}
          {filterTypeResolution && (
            <Badge variant="secondary" className="gap-1 text-xs">
              Type: {TYPE_RESOLUTION_LABELS[filterTypeResolution] ?? filterTypeResolution}
              <button onClick={() => { setFilterTypeResolution(""); setPage(1); }}><X className="h-3 w-3" /></button>
            </Badge>
          )}
          {filterFrequence && (
            <Badge variant="secondary" className="gap-1 text-xs">
              Frequence: {FREQUENCE_LABELS[filterFrequence] ?? filterFrequence}
              <button onClick={() => { setFilterFrequence(""); setPage(1); }}><X className="h-3 w-3" /></button>
            </Badge>
          )}
          {filterAntenneId && (
            <Badge variant="secondary" className="gap-1 text-xs">
              Antenne: {antennes.find((a) => a.id === filterAntenneId)?.nom}
              <button onClick={() => { setFilterAntenneId(""); setPage(1); }}><X className="h-3 w-3" /></button>
            </Badge>
          )}
          <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground" onClick={clearFilters}>
            Tout effacer
          </Button>
        </div>
      )}

      {/* Table */}
      <DataTable
        columns={columns}
        data={data}
        pagination={{
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        }}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        isLoading={isLoading}
      />
    </div>
  );
}
