"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getCongesByEmploye,
  getCongesForApproval,
  getCongeBalance,
  submitConge,
  cancelConge,
} from "@/lib/actions/conge.actions";
import { formatDateFr } from "@/lib/date-utils";
import {
  STATUT_CONGE_LABELS,
  TYPE_CONGE_LABELS,
} from "@/lib/constants";
import {
  CalendarDays,
  CalendarCheck,
  CalendarClock,
  CalendarMinus,
  Send,
  X,
  Eye,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface CongeWithRelations {
  id: string;
  type: string;
  statut: string;
  dateDebut: Date | string;
  dateFin: Date | string;
  nbJours: number;
  motif: string;
  createdAt: Date | string;
  employe?: { nom: string; prenom: string; email?: string; antenne?: { nom: string } | null };
  approbateur?: { nom: string; prenom: string } | null;
}

interface CongeBalance {
  totalDays: number;
  usedDays: number;
  pendingDays: number;
  remainingDays: number;
}

interface CongeListProps {
  userId: string;
  userRole: string;
  showApprovalTab?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function CongeList({ userId, userRole, showApprovalTab }: CongeListProps) {
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState("mes-demandes");

  // State for "Mes demandes"
  const [myConges, setMyConges] = useState<CongeWithRelations[]>([]);
  const [myPagination, setMyPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [myLoading, setMyLoading] = useState(true);

  // State for "En attente d'approbation"
  const [pendingConges, setPendingConges] = useState<CongeWithRelations[]>([]);
  const [pendingPagination, setPendingPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [pendingLoading, setPendingLoading] = useState(true);

  // Solde de conges
  const [balance, setBalance] = useState<CongeBalance>({
    totalDays: 30,
    usedDays: 0,
    pendingDays: 0,
    remainingDays: 30,
  });

  const currentYear = new Date().getFullYear();

  const fetchMyConges = useCallback(async () => {
    setMyLoading(true);
    try {
      const [result, bal] = await Promise.all([
        getCongesByEmploye(userId, currentYear, myPagination.page, myPagination.pageSize),
        getCongeBalance(userId, currentYear),
      ]);
      setMyConges(result.data as CongeWithRelations[]);
      setMyPagination({
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages,
      });
      setBalance(bal);
    } catch {
      // Silent fallback
    } finally {
      setMyLoading(false);
    }
  }, [userId, currentYear, myPagination.page, myPagination.pageSize]);

  const fetchPendingConges = useCallback(async () => {
    if (!showApprovalTab) return;
    setPendingLoading(true);
    try {
      const result = await getCongesForApproval(
        undefined,
        pendingPagination.page,
        pendingPagination.pageSize
      );
      setPendingConges(result.data as CongeWithRelations[]);
      setPendingPagination({
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages,
      });
    } catch {
      // Silent fallback
    } finally {
      setPendingLoading(false);
    }
  }, [showApprovalTab, pendingPagination.page, pendingPagination.pageSize]);

  useEffect(() => {
    fetchMyConges();
  }, [fetchMyConges]);

  useEffect(() => {
    if (activeTab === "approbation") {
      fetchPendingConges();
    }
  }, [activeTab, fetchPendingConges]);

  function handleSubmit(congeId: string) {
    startTransition(async () => {
      const result = await submitConge(congeId);
      if (result.success) {
        toast.success("Demande soumise");
        fetchMyConges();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleCancel(congeId: string) {
    startTransition(async () => {
      const result = await cancelConge(congeId);
      if (result.success) {
        toast.success("Demande annulee");
        fetchMyConges();
        if (showApprovalTab) fetchPendingConges();
      } else {
        toast.error(result.error);
      }
    });
  }

  // Colonnes pour "Mes demandes"
  const myColumns: ColumnDef<CongeWithRelations>[] = [
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) =>
        TYPE_CONGE_LABELS[row.original.type] ?? row.original.type,
    },
    {
      id: "dates",
      header: "Dates",
      cell: ({ row }) =>
        `${formatDateFr(row.original.dateDebut)} - ${formatDateFr(row.original.dateFin)}`,
    },
    {
      accessorKey: "nbJours",
      header: "Jours",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.nbJours}</span>
      ),
    },
    {
      accessorKey: "statut",
      header: "Statut",
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.statut}
          label={STATUT_CONGE_LABELS[row.original.statut]}
        />
      ),
    },
    {
      accessorKey: "motif",
      header: "Motif",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
          {row.original.motif}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const conge = row.original;
        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/conges/${conge.id}`}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
            {conge.statut === "BROUILLON" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSubmit(conge.id)}
                disabled={isPending}
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
            {(conge.statut === "BROUILLON" || conge.statut === "SOUMIS") && (
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" size="sm">
                    <X className="h-4 w-4 text-red-500" />
                  </Button>
                }
                title="Annuler la demande"
                description="Etes-vous sur de vouloir annuler cette demande de conge ?"
                confirmLabel="Annuler la demande"
                onConfirm={() => handleCancel(conge.id)}
                variant="destructive"
              />
            )}
          </div>
        );
      },
    },
  ];

  // Colonnes pour "En attente d'approbation"
  const pendingColumns: ColumnDef<CongeWithRelations>[] = [
    {
      id: "employe",
      header: "Employe",
      cell: ({ row }) => {
        const emp = row.original.employe;
        return emp ? `${emp.prenom} ${emp.nom}` : "-";
      },
    },
    {
      id: "antenne",
      header: "Antenne",
      cell: ({ row }) => row.original.employe?.antenne?.nom ?? "-",
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) =>
        TYPE_CONGE_LABELS[row.original.type] ?? row.original.type,
    },
    {
      id: "dates",
      header: "Dates",
      cell: ({ row }) =>
        `${formatDateFr(row.original.dateDebut)} - ${formatDateFr(row.original.dateFin)}`,
    },
    {
      accessorKey: "nbJours",
      header: "Jours",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.nbJours}</span>
      ),
    },
    {
      accessorKey: "statut",
      header: "Statut",
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.statut}
          label={STATUT_CONGE_LABELS[row.original.statut]}
        />
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/conges/${row.original.id}`}>
            <Eye className="h-4 w-4 mr-1" />
            Traiter
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Cartes de solde */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Droits annuels
            </CardTitle>
            <CalendarDays className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{balance.totalDays} j</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Utilises</CardTitle>
            <CalendarCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {balance.usedDays} j
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <CalendarClock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {balance.pendingDays} j
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Restants</CardTitle>
            <CalendarMinus className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {balance.remainingDays} j
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="mes-demandes">Mes demandes</TabsTrigger>
            {showApprovalTab && (
              <TabsTrigger value="approbation">
                En attente d&apos;approbation
                {pendingPagination.total > 0 && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                    {pendingPagination.total}
                  </span>
                )}
              </TabsTrigger>
            )}
          </TabsList>
          <Button asChild>
            <Link href="/conges/nouveau">
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle demande
            </Link>
          </Button>
        </div>

        <TabsContent value="mes-demandes" className="mt-4">
          <DataTable
            columns={myColumns}
            data={myConges}
            isLoading={myLoading}
            pagination={myPagination}
            onPageChange={(page) =>
              setMyPagination((prev) => ({ ...prev, page }))
            }
            onPageSizeChange={(pageSize) =>
              setMyPagination((prev) => ({ ...prev, page: 1, pageSize }))
            }
          />
        </TabsContent>

        {showApprovalTab && (
          <TabsContent value="approbation" className="mt-4">
            <DataTable
              columns={pendingColumns}
              data={pendingConges}
              isLoading={pendingLoading}
              pagination={pendingPagination}
              onPageChange={(page) =>
                setPendingPagination((prev) => ({ ...prev, page }))
              }
              onPageSizeChange={(pageSize) =>
                setPendingPagination((prev) => ({
                  ...prev,
                  page: 1,
                  pageSize,
                }))
              }
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
