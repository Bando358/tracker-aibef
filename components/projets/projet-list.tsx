"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Pencil, Trash2, Activity } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { getAllProjets, deleteProjet } from "@/lib/actions/projet.actions";
import { DataTable } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { PaginatedResult } from "@/types";

type ProjetRow = {
  id: string;
  code: string;
  nom: string;
  description: string | null;
  dateDebut: Date;
  dateFin: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  antenne: { id: string; nom: string; code: string } | null;
  _count: { activites: number };
};

interface ProjetListProps {
  initialData: PaginatedResult<ProjetRow>;
}

export function ProjetList({ initialData }: ProjetListProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData.data);
  const [pagination, setPagination] = useState({
    page: initialData.page,
    pageSize: initialData.pageSize,
    total: initialData.total,
    totalPages: initialData.totalPages,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(
    async (params: { search?: string; page?: number; pageSize?: number }) => {
      setIsLoading(true);
      try {
        const result = await getAllProjets({
          search: params.search ?? search,
          page: params.page ?? pagination.page,
          pageSize: params.pageSize ?? pagination.pageSize,
        });
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
    [search, pagination.page, pagination.pageSize]
  );

  function handleSearch(query: string) {
    setSearch(query);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchData({ search: query, page: 1 });
    }, 400);
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

  const columns: ColumnDef<ProjetRow>[] = [
    {
      accessorKey: "code",
      header: "Code",
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono text-xs">
          {row.original.code}
        </Badge>
      ),
    },
    {
      accessorKey: "nom",
      header: "Nom",
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
      accessorKey: "dateDebut",
      header: "Date debut",
      cell: ({ row }) =>
        format(new Date(row.original.dateDebut), "dd/MM/yyyy", { locale: fr }),
    },
    {
      accessorKey: "dateFin",
      header: "Date fin",
      cell: ({ row }) =>
        row.original.dateFin
          ? format(new Date(row.original.dateFin), "dd/MM/yyyy", { locale: fr })
          : <span className="text-muted-foreground text-sm">—</span>,
    },
    {
      id: "activites",
      header: "Activites",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <span>{row.original._count.activites}</span>
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
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
    <DataTable
      columns={columns}
      data={data}
      searchPlaceholder="Rechercher un projet..."
      onSearch={handleSearch}
      pagination={pagination}
      onPageChange={(page) => fetchData({ page })}
      onPageSizeChange={(pageSize) => fetchData({ page: 1, pageSize })}
      isLoading={isLoading}
    />
  );
}
