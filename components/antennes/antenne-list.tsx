"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
// Antenne type defined locally to avoid importing from server-only @/app/generated/prisma
import type { PaginatedResult } from "@/types";
import { getAllAntennes, deleteAntenne } from "@/lib/actions/antenne.actions";
import { DataTable } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Pencil, Trash2, Users, Activity } from "lucide-react";
import Link from "next/link";

type AntenneWithCount = {
  id: string;
  nom: string;
  code: string;
  region: string;
  ville: string;
  adresse: string | null;
  telephone: string | null;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: { employes: number; activiteAntennes: number };
};

interface AntenneListProps {
  initialData: PaginatedResult<AntenneWithCount>;
}

export function AntenneList({ initialData }: AntenneListProps) {
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
        const result = await getAllAntennes({
          search: params.search ?? search,
          page: params.page ?? pagination.page,
          pageSize: params.pageSize ?? pagination.pageSize,
        });
        setData(result.data);
        setPagination({
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: result.totalPages,
        });
      } catch {
        toast.error("Erreur lors du chargement des antennes");
      } finally {
        setIsLoading(false);
      }
    },
    [search, pagination.page, pagination.pageSize]
  );

  function handleSearch(query: string) {
    setSearch(query);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      fetchData({ search: query, page: 1 });
    }, 400);
  }

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  function handlePageChange(page: number) {
    fetchData({ page });
  }

  function handlePageSizeChange(pageSize: number) {
    fetchData({ page: 1, pageSize });
  }

  async function handleDelete(id: string) {
    const result = await deleteAntenne(id);
    if (result.success) {
      toast.success("Antenne supprimee avec succes");
      fetchData({ page: 1 });
    } else {
      toast.error(result.error);
    }
  }

  const columns: ColumnDef<AntenneWithCount>[] = [
    {
      accessorKey: "nom",
      header: "Nom",
      cell: ({ row }) => (
        <Link
          href={`/antennes/${row.original.id}`}
          className="font-medium text-primary hover:underline"
        >
          {row.original.nom}
        </Link>
      ),
    },
    {
      accessorKey: "code",
      header: "Code",
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono">
          {row.original.code}
        </Badge>
      ),
    },
    {
      accessorKey: "region",
      header: "Region",
    },
    {
      accessorKey: "ville",
      header: "Ville",
    },
    {
      id: "employes",
      header: "Employes",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>{row.original._count.employes}</span>
        </div>
      ),
    },
    {
      id: "activites",
      header: "Activites",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <span>{row.original._count.activiteAntennes}</span>
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
            onClick={() => router.push(`/antennes/${row.original.id}`)}
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
            title="Supprimer l'antenne"
            description={`Etes-vous sur de vouloir supprimer l'antenne "${row.original.nom}" ? Cette action est irreversible.`}
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
      searchPlaceholder="Rechercher une antenne..."
      onSearch={handleSearch}
      pagination={pagination}
      onPageChange={handlePageChange}
      onPageSizeChange={handlePageSizeChange}
      isLoading={isLoading}
    />
  );
}
