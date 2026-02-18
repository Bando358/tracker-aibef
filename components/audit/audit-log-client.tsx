"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { formatDateTimeFr } from "@/lib/date-utils";

// ======================== TYPES ========================

interface AuditLogEntry {
  id: string;
  createdAt: string | Date;
  action: string;
  entite: string;
  entiteId: string | null;
  details: string | null;
  ipAddress: string | null;
  userId: string;
  user: {
    nom: string;
    prenom: string;
    email: string;
  };
}

interface AuditLogClientProps {
  data: AuditLogEntry[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  initialSearch: string;
}

// ======================== COLUMNS ========================

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-100 text-green-700 border-green-200",
  UPDATE: "bg-blue-100 text-blue-700 border-blue-200",
  DELETE: "bg-red-100 text-red-700 border-red-200",
  LOGIN: "bg-cyan-100 text-cyan-700 border-cyan-200",
  LOGOUT: "bg-slate-100 text-slate-700 border-slate-200",
  APPROVE: "bg-green-100 text-green-700 border-green-200",
  REJECT: "bg-red-100 text-red-700 border-red-200",
  STATUS_CHANGE: "bg-amber-100 text-amber-700 border-amber-200",
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Creation",
  UPDATE: "Modification",
  DELETE: "Suppression",
  LOGIN: "Connexion",
  LOGOUT: "Deconnexion",
  APPROVE: "Approbation",
  REJECT: "Rejet",
  STATUS_CHANGE: "Changement de statut",
};

const columns: ColumnDef<AuditLogEntry>[] = [
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-sm">
        {formatDateTimeFr(row.original.createdAt)}
      </span>
    ),
  },
  {
    accessorKey: "user",
    header: "Utilisateur",
    cell: ({ row }) => (
      <div>
        <div className="font-medium">
          {row.original.user.prenom} {row.original.user.nom}
        </div>
        <div className="text-xs text-muted-foreground">
          {row.original.user.email}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "action",
    header: "Action",
    cell: ({ row }) => {
      const action = row.original.action;
      return (
        <Badge
          variant="outline"
          className={ACTION_COLORS[action] ?? "bg-gray-100 text-gray-700 border-gray-200"}
        >
          {ACTION_LABELS[action] ?? action}
        </Badge>
      );
    },
  },
  {
    accessorKey: "entite",
    header: "Entite",
    cell: ({ row }) => (
      <span className="text-sm">{row.original.entite}</span>
    ),
  },
  {
    accessorKey: "details",
    header: "Details",
    cell: ({ row }) => (
      <span className="max-w-[300px] truncate text-sm text-muted-foreground">
        {row.original.details ?? "-"}
      </span>
    ),
  },
];

// ======================== COMPONENT ========================

export function AuditLogClient({
  data,
  pagination,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  initialSearch,
}: AuditLogClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      router.push(`/audit-log?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleSearch = useCallback(
    (query: string) => {
      updateParams({ search: query || undefined, page: undefined });
    },
    [updateParams]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      updateParams({ page: String(page) });
    },
    [updateParams]
  );

  const handlePageSizeChange = useCallback(
    (pageSize: number) => {
      updateParams({ pageSize: String(pageSize), page: undefined });
    },
    [updateParams]
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      searchPlaceholder="Rechercher dans le journal..."
      pagination={pagination}
      onSearch={handleSearch}
      onPageChange={handlePageChange}
      onPageSizeChange={handlePageSizeChange}
    />
  );
}
