"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Pencil,
  Trash2,
  Activity,
  Search,
  Filter,
  X,
  ArrowUpDown,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { getAllProjets, deleteProjet } from "@/lib/actions/projet.actions";
import { DataTable } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import type { PaginatedResult } from "@/types";

type ProjetRow = {
  id: string;
  code: string;
  nom: string;
  description: string | null;
  dateDebut: Date;
  dateFin: Date | null;
  budget: number | null;
  typeFonds: string | null;
  bailleur: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  antenne: { id: string; nom: string; code: string } | null;
  _count: { activites: number };
};

interface ProjetListProps {
  initialData: PaginatedResult<ProjetRow>;
  bailleurs: string[];
  typesFonds: string[];
  antennes: Array<{ id: string; nom: string }>;
}

interface Filters {
  search: string;
  bailleur: string;
  typeFonds: string;
  antenneId: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

export function ProjetList({
  initialData,
  bailleurs,
  typesFonds,
  antennes,
}: ProjetListProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData.data);
  const [pagination, setPagination] = useState({
    page: initialData.page,
    pageSize: initialData.pageSize,
    total: initialData.total,
    totalPages: initialData.totalPages,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    search: "",
    bailleur: "",
    typeFonds: "",
    antenneId: "",
    sortBy: "code",
    sortOrder: "asc",
  });
  const [showFilters, setShowFilters] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeFilterCount = [
    filters.bailleur,
    filters.typeFonds,
    filters.antenneId,
  ].filter(Boolean).length;

  const fetchData = useCallback(
    async (overrides?: Partial<Filters & { page: number; pageSize: number }>) => {
      setIsLoading(true);
      try {
        const params = {
          search: overrides?.search ?? filters.search,
          bailleur: (overrides?.bailleur ?? filters.bailleur) || undefined,
          typeFonds: (overrides?.typeFonds ?? filters.typeFonds) || undefined,
          antenneId: (overrides?.antenneId ?? filters.antenneId) || undefined,
          sortBy: overrides?.sortBy ?? filters.sortBy,
          sortOrder: overrides?.sortOrder ?? filters.sortOrder,
          page: overrides?.page ?? pagination.page,
          pageSize: overrides?.pageSize ?? pagination.pageSize,
        };
        const result = await getAllProjets(params);
        setData(result.data as ProjetRow[]);
        setPagination({
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: result.totalPages,
        });
      } catch {
        toast.error("Erreur lors du chargement des projets");
      } finally {
        setIsLoading(false);
      }
    },
    [filters, pagination.page, pagination.pageSize]
  );

  function handleSearch(query: string) {
    setFilters((prev) => ({ ...prev, search: query }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchData({ search: query, page: 1 });
    }, 400);
  }

  function handleFilterChange(key: keyof Filters, value: string) {
    const updated = { ...filters, [key]: value };
    setFilters(updated);
    fetchData({ ...updated, page: 1 });
  }

  function handleSort(field: string) {
    const newOrder =
      filters.sortBy === field && filters.sortOrder === "asc" ? "desc" : "asc";
    const updated = { ...filters, sortBy: field, sortOrder: newOrder as "asc" | "desc" };
    setFilters(updated);
    fetchData({ ...updated, page: 1 });
  }

  function clearFilters() {
    const reset: Filters = {
      search: "",
      bailleur: "",
      typeFonds: "",
      antenneId: "",
      sortBy: "code",
      sortOrder: "asc",
    };
    setFilters(reset);
    fetchData({ ...reset, page: 1 });
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  async function handleDelete(id: string) {
    const result = await deleteProjet(id);
    if (result.success) {
      toast.success("Projet supprime avec succes");
      fetchData({ page: 1 });
    } else {
      toast.error(result.error);
    }
  }

  function SortButton({ field, label }: { field: string; label: string }) {
    const isActive = filters.sortBy === field;
    return (
      <button
        className="flex items-center gap-1 group"
        onClick={() => handleSort(field)}
      >
        {label}
        <ArrowUpDown
          className={`h-3 w-3 transition-colors ${
            isActive
              ? "text-primary"
              : "text-muted-foreground/40 group-hover:text-muted-foreground"
          }`}
        />
      </button>
    );
  }

  const columns: ColumnDef<ProjetRow>[] = [
    {
      accessorKey: "code",
      header: () => <SortButton field="code" label="Code" />,
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono text-xs">
          {row.original.code}
        </Badge>
      ),
    },
    {
      accessorKey: "nom",
      header: () => <SortButton field="nom" label="Nom" />,
      cell: ({ row }) => (
        <Link
          href={`/projets/${row.original.id}`}
          className="font-medium text-primary hover:underline"
        >
          {row.original.nom}
        </Link>
      ),
    },
    {
      accessorKey: "bailleur",
      header: "Bailleur",
      cell: ({ row }) =>
        row.original.bailleur ? (
          <span className="text-sm">{row.original.bailleur}</span>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
    {
      accessorKey: "budget",
      header: () => <SortButton field="budget" label="Budget" />,
      cell: ({ row }) =>
        row.original.budget ? (
          <span className="font-medium tabular-nums text-sm">
            {new Intl.NumberFormat("fr-FR").format(row.original.budget)} FCFA
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
    {
      accessorKey: "dateDebut",
      header: () => <SortButton field="dateDebut" label="Debut" />,
      cell: ({ row }) =>
        format(new Date(row.original.dateDebut), "dd/MM/yyyy", { locale: fr }),
    },
    {
      accessorKey: "dateFin",
      header: "Fin",
      cell: ({ row }) =>
        row.original.dateFin ? (
          format(new Date(row.original.dateFin), "dd/MM/yyyy", { locale: fr })
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
    {
      id: "activites",
      header: () => <SortButton field="activites" label="Activites" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.original._count.activites}</span>
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => router.push(`/projets/${row.original.id}`)}
            title="Modifier"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <ConfirmDialog
            trigger={
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                title="Supprimer"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            }
            title="Supprimer le projet"
            description={`Etes-vous sur de vouloir supprimer le projet "${row.original.nom}" ? Cette action est irreversible.`}
            confirmLabel="Supprimer"
            onConfirm={() => handleDelete(row.original.id)}
            variant="destructive"
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Barre de recherche + filtres */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par code, nom, bailleur..."
            value={filters.search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 pr-8"
          />
          {filters.search && (
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
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
              >
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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground"
                      onClick={clearFilters}
                    >
                      <X className="mr-1 h-3 w-3" />
                      Reinitialiser
                    </Button>
                  )}
                </div>

                {/* Bailleur */}
                {bailleurs.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Bailleur
                    </label>
                    <Select
                      value={filters.bailleur || "__all__"}
                      onValueChange={(v) =>
                        handleFilterChange("bailleur", v === "__all__" ? "" : v)
                      }
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Tous" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Tous les bailleurs</SelectItem>
                        {bailleurs.map((b) => (
                          <SelectItem key={b} value={b}>
                            {b}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Type de fonds */}
                {typesFonds.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Type de fonds
                    </label>
                    <Select
                      value={filters.typeFonds || "__all__"}
                      onValueChange={(v) =>
                        handleFilterChange("typeFonds", v === "__all__" ? "" : v)
                      }
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Tous" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Tous les types</SelectItem>
                        {typesFonds.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Antenne */}
                {antennes.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Antenne
                    </label>
                    <Select
                      value={filters.antenneId || "__all__"}
                      onValueChange={(v) =>
                        handleFilterChange("antenneId", v === "__all__" ? "" : v)
                      }
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Toutes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Toutes les antennes</SelectItem>
                        {antennes.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Compteur résultats */}
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {pagination.total} projet(s)
          </span>
        </div>
      </div>

      {/* Filtres actifs */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Filtres :</span>
          {filters.bailleur && (
            <Badge variant="secondary" className="gap-1 text-xs">
              Bailleur: {filters.bailleur}
              <button onClick={() => handleFilterChange("bailleur", "")}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.typeFonds && (
            <Badge variant="secondary" className="gap-1 text-xs">
              Fonds: {filters.typeFonds}
              <button onClick={() => handleFilterChange("typeFonds", "")}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.antenneId && (
            <Badge variant="secondary" className="gap-1 text-xs">
              Antenne: {antennes.find((a) => a.id === filters.antenneId)?.nom}
              <button onClick={() => handleFilterChange("antenneId", "")}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs text-muted-foreground"
            onClick={clearFilters}
          >
            Tout effacer
          </Button>
        </div>
      )}

      {/* Tableau */}
      <DataTable
        columns={columns}
        data={data}
        pagination={pagination}
        onPageChange={(page) => fetchData({ page })}
        onPageSizeChange={(pageSize) => fetchData({ page: 1, pageSize })}
        isLoading={isLoading}
      />
    </div>
  );
}
