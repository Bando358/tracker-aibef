import { redirect } from "next/navigation";
import { Shield } from "lucide-react";
import { getSessionUser } from "@/lib/actions/auth.actions";
import { getAuditLogs } from "@/lib/actions/audit.actions";
import { AuditLogClient } from "@/components/audit/audit-log-client";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Journal d'Audit - TRACKER AIBEF",
};

interface AuditLogPageProps {
  searchParams: {
    search?: string;
    page?: string;
    pageSize?: string;
  };
}

export default async function AuditLogPage({
  searchParams,
}: AuditLogPageProps) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const pageSize = searchParams.pageSize
    ? parseInt(searchParams.pageSize, 10)
    : 20;

  const result = await getAuditLogs({
    search: searchParams.search,
    page,
    pageSize,
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-600 to-slate-700 p-6 text-white shadow-lg shadow-slate-600/25">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-white/5" />
        <div className="absolute right-12 top-3 h-2.5 w-2.5 rounded-full bg-white/20" />
        <div className="absolute right-[7rem] top-8 h-1.5 w-1.5 rounded-full bg-white/15" />
        <div className="absolute left-1/3 -top-8 h-24 w-24 rounded-full bg-white/[0.07]" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Journal d&apos;Audit</h1>
            <p className="text-sm text-white/80">
              Historique de toutes les actions effectuees dans le systeme
            </p>
          </div>
        </div>
      </div>
      <AuditLogClient
        data={result.data}
        pagination={{
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: result.totalPages,
        }}
        initialSearch={searchParams.search ?? ""}
      />
    </div>
  );
}
