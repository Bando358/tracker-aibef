import { redirect } from "next/navigation";
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Journal d&apos;Audit
        </h1>
        <p className="text-muted-foreground">
          Historique de toutes les actions effectuees dans le systeme
        </p>
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
