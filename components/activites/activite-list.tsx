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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
type ActiviteAntenneRow = {
  antenneId: string;
  responsableId: string;
  antenne: { id: string; nom: string; code: string };
  responsable: { id: string; nom: string; prenom: string; email: string };
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

interface ActiviteListProps {
  initialData: PaginatedResult<ActiviteRow>;
}

// ------------------------------------------------------------------
// Tab filter definitions
// ------------------------------------------------------------------
const TABS: Array<{ value: string; label: string; statut?: StatutActiviteType }> = [
  { value: "all", label: "Toutes" },
  { value: "PLANIFIEE", label: "Planifiees", statut: "PLANIFIEE" },
  { value: "EN_COURS", label: "En cours", statut: "EN_COURS" },
  { value: "EN_RETARD", label: "En retard", statut: "EN_RETARD" },
  { value: "REALISEE", label: "Realisees", statut: "REALISEE" },
];

// ------------------------------------------------------------------
// Component
// ------------------------------------------------------------------
export function ActiviteList({ initialData }: ActiviteListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState<PaginatedResult<ActiviteRow>>(initialData);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialData.pageSize);

  const fetchData = useCallback(
    (overrides?: {
      statut?: StatutActiviteType;
      search?: string;
      page?: number;
      pageSize?: number;
    }) => {
      startTransition(async () => {
        try {
          const statutFilter =
            overrides?.statut ??
            TABS.find((t) => t.value === activeTab)?.statut;

          const result = await getAllActivites({
            search: overrides?.search ?? search,
            page: overrides?.page ?? page,
            pageSize: overrides?.pageSize ?? pageSize,
            statut: statutFilter,
          });
          setData(result);
        } catch {
          toast.error("Erreur lors du chargement des activites");
        }
      });
    },
    [activeTab, search, page, pageSize]
  );

  // Recharger quand les parametres changent
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleTabChange(value: string) {
    setActiveTab(value);
    setPage(1);
    const tab = TABS.find((t) => t.value === value);
    startTransition(async () => {
      try {
        const result = await getAllActivites({
          search,
          page: 1,
          pageSize,
          statut: tab?.statut,
        });
        setData(result);
      } catch {
        toast.error("Erreur lors du chargement des activites");
      }
    });
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
      cell: ({ row }) => (
        <ActiviteStatusBadge statut={row.original.statut} />
      ),
    },
    {
      accessorKey: "dateDebut",
      header: "Date debut",
      cell: ({ row }) => formatDateFr(row.original.dateDebut),
    },
    {
      accessorKey: "dateFin",
      header: "Date fin",
      cell: ({ row }) => formatDateFr(row.original.dateFin),
    },
    {
      id: "antennes",
      header: "Antennes",
      cell: ({ row }) => (
        <Badge variant="secondary">
          {row.original.activiteAntennes.length}
        </Badge>
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
              <Link href={`/activites/${row.original.id}?edit=true`}>
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
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <DataTable
        columns={columns}
        data={data.data}
        searchPlaceholder="Rechercher une activite..."
        onSearch={handleSearch}
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
