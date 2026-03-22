"use client";

import { useState, useTransition, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import {
  Eye,
  Pencil,
  Trash2,
  MoreHorizontal,
} from "lucide-react";

import { getAllActivites, deleteActivite } from "@/lib/actions/activite.actions";
import { formatDateFr } from "@/lib/date-utils";
import type { StatutActiviteType } from "@/types";
import type { PaginatedResult } from "@/types";

import { DataTable } from "@/components/shared/data-table";
import { ActiviteStatusBadge } from "@/components/activites/activite-status-badge";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, X, Filter } from "lucide-react";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
type ActiviteAntenneRow = {
  antenneId: string;
  responsableId: string | null;
  antenne: { id: string; nom: string; code: string };
  responsable: { id: string; nom: string; prenom: string; email: string } | null;
  periodes: {
    id: string;
    dateDebut: Date;
    dateFin: Date;
    statut: string;
    dateRealisee: Date | null;
    commentaire: string | null;
  }[];
};

type ActiviteRow = {
  id: string;
  titre: string;
  type: string;
  statut: StatutActiviteType;
  dateDebut: Date | null;
  dateFin: Date | null;
  activiteAntennes: ActiviteAntenneRow[];
  createur: { id: string; nom: string; prenom: string };
};

interface AntenneOption {
  id: string;
  nom: string;
}

interface ProjetOption {
  id: string;
  code: string;
  nom: string;
}

interface ActiviteListProps {
  initialData: PaginatedResult<ActiviteRow>;
  antennes?: AntenneOption[];
  projets?: ProjetOption[];
}

// ------------------------------------------------------------------
// Tab filter definitions
// ------------------------------------------------------------------
const TABS: Array<{ value: string; label: string; statut?: StatutActiviteType }> = [
  { value: "all", label: "Toutes" },
  { value: "NON_PLANIFIEE", label: "Non planifiees", statut: "NON_PLANIFIEE" },
  { value: "PLANIFIEE", label: "Planifiees", statut: "PLANIFIEE" },
  { value: "EN_COURS", label: "En cours", statut: "EN_COURS" },
  { value: "EN_RETARD", label: "En retard", statut: "EN_RETARD" },
  { value: "REALISEE", label: "Realisees", statut: "REALISEE" },
];

// ------------------------------------------------------------------
// Component
// ------------------------------------------------------------------
export function ActiviteList({ initialData, antennes = [], projets = [] }: ActiviteListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState<PaginatedResult<ActiviteRow>>(initialData);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [projetId, setProjetId] = useState("__all__");
  const [antenneId, setAntenneId] = useState("__all__");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialData.pageSize);

  const hasActiveFilters = projetId !== "__all__" || antenneId !== "__all__";

  const buildFilters = useCallback(
    (overrides?: {
      statut?: StatutActiviteType;
      search?: string;
      page?: number;
      pageSize?: number;
      projetId?: string;
      antenneId?: string;
    }) => ({
      search: overrides?.search ?? search,
      page: overrides?.page ?? page,
      pageSize: overrides?.pageSize ?? pageSize,
      statut:
        overrides?.statut ??
        TABS.find((t) => t.value === activeTab)?.statut,
      projetId: (() => {
        const pid = overrides?.projetId ?? projetId;
        return pid === "__all__" ? undefined : pid;
      })(),
      antenneId: (() => {
        const aid = overrides?.antenneId ?? antenneId;
        return aid === "__all__" ? undefined : aid;
      })(),
    }),
    [activeTab, search, page, pageSize, projetId, antenneId]
  );

  const fetchData = useCallback(
    (overrides?: Parameters<typeof buildFilters>[0]) => {
      startTransition(async () => {
        try {
          const result = await getAllActivites(buildFilters(overrides));
          setData(result);
        } catch {
          toast.error("Erreur lors du chargement des activites");
        }
      });
    },
    [buildFilters]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleTabChange(value: string) {
    setActiveTab(value);
    setPage(1);
    const tab = TABS.find((t) => t.value === value);
    fetchData({ statut: tab?.statut, page: 1 });
  }

  function handleSearch(query: string) {
    setSearch(query);
    setPage(1);
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
  }

  function handlePageSizeChange(newPageSize: number) {
    setPageSize(newPageSize);
    setPage(1);
  }

  function clearFilters() {
    setProjetId("__all__");
    setAntenneId("__all__");
    setSearch("");
    setActiveTab("all");
    setPage(1);
    fetchData({
      search: "",
      statut: undefined,
      projetId: "__all__",
      antenneId: "__all__",
      page: 1,
    });
  }

  async function handleDelete(id: string) {
    const result = await deleteActivite(id);
    if (result.success) {
      toast.success("Activite supprimee");
      fetchData();
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  // ------------------------------------------------------------------
  // Columns
  // ------------------------------------------------------------------
  const columns: ColumnDef<ActiviteRow>[] = [
    {
      accessorKey: "titre",
      header: "Titre",
      cell: ({ row }) => (
        <Link
          href={`/activites/${row.original.id}`}
          className="font-medium text-primary hover:underline"
        >
          {row.original.titre}
        </Link>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.type === "PONCTUELLE" ? "Ponctuelle" : "Periodique"}
        </Badge>
      ),
    },
    {
      accessorKey: "statut",
      header: "Statut",
      cell: ({ row }) => {
        const allPeriodes = row.original.activiteAntennes
          .flatMap((aa) =>
            (aa.periodes ?? []).map((p) => ({
              statut: p.statut as StatutActiviteType,
              antenne: aa.antenne.nom,
              dateDebut: p.dateDebut,
              dateFin: p.dateFin,
            }))
          )
          .sort((a, b) => a.antenne.localeCompare(b.antenne) || new Date(a.dateDebut).getTime() - new Date(b.dateDebut).getTime());
        if (allPeriodes.length === 0) {
          return <ActiviteStatusBadge statut={row.original.statut} />;
        }
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-default">
                  <ActiviteStatusBadge statut={row.original.statut} />
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="p-0 bg-popover text-popover-foreground border shadow-md max-h-[300px] overflow-hidden flex flex-col">
                <table className="text-xs">
                  <thead className="sticky top-0 bg-popover z-10">
                    <tr className="border-b">
                      <th className="px-3 py-1.5 text-left font-medium">Antenne</th>
                      <th className="px-3 py-1.5 text-left font-medium">Debut</th>
                      <th className="px-3 py-1.5 text-left font-medium">Fin</th>
                      <th className="px-3 py-1.5 text-left font-medium">Statut</th>
                    </tr>
                  </thead>
                </table>
                <div className="overflow-y-auto max-h-[260px]">
                  <table className="text-xs w-full">
                    <tbody>
                      {allPeriodes.map((p, i) => {
                        const prevAntenne = i > 0 ? allPeriodes[i - 1].antenne : null;
                        const isNewAntenne = p.antenne !== prevAntenne;
                        return (
                          <tr
                            key={i}
                            className={`border-b last:border-0 ${
                              isNewAntenne && i > 0 ? "border-t-2 border-t-border" : ""
                            }`}
                          >
                            <td className="px-3 py-1.5 font-medium">{p.antenne}</td>
                            <td className="px-3 py-1.5">{formatDateFr(p.dateDebut)}</td>
                            <td className="px-3 py-1.5">{formatDateFr(p.dateFin)}</td>
                            <td className="px-3 py-1.5"><ActiviteStatusBadge statut={p.statut} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      accessorKey: "dateDebut",
      header: "Date debut",
      cell: ({ row }) => {
        const allPeriodes = row.original.activiteAntennes.flatMap((aa) =>
          (aa.periodes ?? []).map((p) => ({
            dateDebut: p.dateDebut,
            antenne: aa.antenne.nom,
          }))
        );
        if (allPeriodes.length === 0) {
          return <span className="text-sm">{formatDateFr(row.original.dateDebut)}</span>;
        }
        const earliest = allPeriodes.reduce((min, p) =>
          new Date(p.dateDebut) < new Date(min.dateDebut) ? p : min
        );
        return <span className="text-sm">{formatDateFr(earliest.dateDebut)}</span>;
      },
    },
    {
      accessorKey: "dateFin",
      header: "Date fin",
      cell: ({ row }) => {
        const allPeriodes = row.original.activiteAntennes.flatMap((aa) =>
          (aa.periodes ?? []).map((p) => ({
            dateFin: p.dateFin,
            antenne: aa.antenne.nom,
          }))
        );
        if (allPeriodes.length === 0) {
          return <span className="text-sm">{formatDateFr(row.original.dateFin)}</span>;
        }
        const latest = allPeriodes.reduce((max, p) =>
          new Date(p.dateFin) > new Date(max.dateFin) ? p : max
        );
        return <span className="text-sm">{formatDateFr(latest.dateFin)}</span>;
      },
    },
    {
      id: "periodes",
      header: "Nbre",
      cell: ({ row }) => {
        const totalPeriodes = row.original.activiteAntennes.reduce(
          (sum, aa) => sum + (aa.periodes?.length ?? 0),
          0
        );
        return (
          <Badge variant="secondary">
            {totalPeriodes || "-"}
          </Badge>
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
              <span className="sr-only">Menu actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/activites/${row.original.id}`}>
                <Eye className="mr-2 h-4 w-4" />
                Voir le detail
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/activites/${row.original.id}/modifier`}>
                <Pencil className="mr-2 h-4 w-4" />
                Modifier
              </Link>
            </DropdownMenuItem>
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
              title="Supprimer l'activite"
              description={`Etes-vous sur de vouloir supprimer l'activite "${row.original.titre}" ? Cette action est irreversible.`}
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
      {/* Barre de recherche + bouton filtres */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Rechercher par titre, projet, code..."
            className="pl-9 pr-9 h-9"
          />
          {search && (
            <button
              onClick={() => handleSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showFilters ? "secondary" : "outline"}
            size="sm"
            className="h-9"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            Filtres
            {hasActiveFilters && (
              <Badge className="ml-1.5 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground">
                {(projetId !== "__all__" ? 1 : 0) + (antenneId !== "__all__" ? 1 : 0)}
              </Badge>
            )}
          </Button>
          {(hasActiveFilters || search || activeTab !== "all") && (
            <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={clearFilters}>
              <X className="mr-1 h-3 w-3" />
              Reinitialiser
            </Button>
          )}
        </div>
      </div>

      {/* Filtres avances */}
      {showFilters && (
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border/60 bg-muted/20 p-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Projet</label>
            <Select value={projetId} onValueChange={(v) => { setProjetId(v); setPage(1); }}>
              <SelectTrigger className="h-8 w-[180px] text-xs">
                <SelectValue placeholder="Tous les projets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tous les projets</SelectItem>
                {projets.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.code} - {p.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Antenne</label>
            <Select value={antenneId} onValueChange={(v) => { setAntenneId(v); setPage(1); }}>
              <SelectTrigger className="h-8 w-[160px] text-xs">
                <SelectValue placeholder="Toutes les antennes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Toutes les antennes</SelectItem>
                {antennes.map((a) => (
                  <SelectItem key={a.id} value={a.id} className="text-xs">
                    {a.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Onglets par statut */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="flex-wrap h-auto">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Compteur resultats */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{data.total} activite(s) trouvee(s)</span>
        {isPending && <span className="text-primary">Chargement...</span>}
      </div>

      <DataTable
        columns={columns}
        data={data.data}
        pagination={{
          page: data.page,
          pageSize: data.pageSize,
          total: data.total,
          totalPages: data.totalPages,
        }}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        isLoading={isPending}
      />
    </div>
  );
}
