"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { MoreHorizontal, Pencil, UserX } from "lucide-react";
import Link from "next/link";

import { DataTable } from "@/components/shared/data-table";
import { RoleBadge } from "@/components/employes/role-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  getAllEmployes,
  deactivateEmploye,
  type UserWithAntenne,
} from "@/lib/actions/employe.actions";
import type { PaginatedResult } from "@/types";
import type { RoleType } from "@/types";

interface EmployeListProps {
  initialData: PaginatedResult<UserWithAntenne>;
}

export function EmployeList({ initialData }: EmployeListProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [, startTransition] = useTransition();

  const fetchData = useCallback(
    async (params: { search?: string; page?: number; pageSize?: number }) => {
      setIsLoading(true);
      try {
        const result = await getAllEmployes({
          search: params.search ?? search,
          page: params.page ?? data.page,
          pageSize: params.pageSize ?? data.pageSize,
        });
        setData(result);
      } catch {
        toast.error("Erreur lors du chargement des employes");
      } finally {
        setIsLoading(false);
      }
    },
    [search, data.page, data.pageSize]
  );

  function handleSearch(query: string) {
    setSearch(query);
    fetchData({ search: query, page: 1 });
  }

  function handlePageChange(page: number) {
    fetchData({ page });
  }

  function handlePageSizeChange(pageSize: number) {
    fetchData({ pageSize, page: 1 });
  }

  function handleDeactivate(id: string) {
    startTransition(async () => {
      const result = await deactivateEmploye(id);
      if (result.success) {
        toast.success("Employe desactive avec succes");
        fetchData({});
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const columns: ColumnDef<UserWithAntenne>[] = [
    {
      accessorKey: "nom",
      header: "Nom Complet",
      cell: ({ row }) => (
        <div className="font-medium">
          {row.original.nom} {row.original.prenom}
        </div>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => <RoleBadge role={row.original.role as RoleType} />,
    },
    {
      accessorKey: "antenne",
      header: "Antenne",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.antenne?.nom ?? "-"}
        </span>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Statut",
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.isActive ? "PRESENT" : "ABSENT"}
          label={row.original.isActive ? "Actif" : "Inactif"}
        />
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const employe = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/employes/${employe.id}`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Modifier
                </Link>
              </DropdownMenuItem>
              {employe.isActive && (
                <>
                  <DropdownMenuSeparator />
                  <ConfirmDialog
                    trigger={
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        className="text-destructive focus:text-destructive"
                      >
                        <UserX className="mr-2 h-4 w-4" />
                        Desactiver
                      </DropdownMenuItem>
                    }
                    title="Desactiver l'employe"
                    description={`Etes-vous sur de vouloir desactiver le compte de ${employe.prenom} ${employe.nom} ? L'employe ne pourra plus se connecter.`}
                    confirmLabel="Desactiver"
                    onConfirm={() => handleDeactivate(employe.id)}
                    variant="destructive"
                  />
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data.data}
      searchPlaceholder="Rechercher par nom, prenom, email..."
      onSearch={handleSearch}
      pagination={{
        page: data.page,
        pageSize: data.pageSize,
        total: data.total,
        totalPages: data.totalPages,
      }}
      onPageChange={handlePageChange}
      onPageSizeChange={handlePageSizeChange}
      isLoading={isLoading}
    />
  );
}
