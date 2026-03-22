import { redirect } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { getSessionUser } from "@/lib/actions/auth.actions";
import {
  fetchRapportFilterOptions,
  fetchActiviteReport,
  fetchRecommandationReport,
  fetchPointageReport,
  fetchPerformanceReport,
} from "@/lib/actions/rapport.actions";
import { RapportsClient } from "@/components/rapports/rapports-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Rapports | TRACKER-AIBEF",
};

export default async function RapportsPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  if (
    !["SUPER_ADMIN", "ADMIN_SIMPLE", "RESPONSABLE_ANTENNE", "ADMIN_ANTENNE"].includes(
      session.role
    )
  ) {
    redirect("/dashboard");
  }

  const now = new Date();
  const yearStart = `${now.getFullYear()}-01-01`;
  const yearEnd = `${now.getFullYear()}-12-31`;

  const [filterOptions, activiteData, recommandationData, pointageData, performanceData] =
    await Promise.all([
      fetchRapportFilterOptions(),
      fetchActiviteReport({ dateDebut: yearStart, dateFin: yearEnd }),
      fetchRecommandationReport({ dateDebut: yearStart, dateFin: yearEnd }),
      fetchPointageReport({ mois: now.getMonth() + 1, annee: now.getFullYear() }),
      fetchPerformanceReport({ dateDebut: yearStart, dateFin: yearEnd }),
    ]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 p-4 sm:p-6 text-white shadow-md sm:shadow-lg sm:shadow-violet-500/25">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10 hidden sm:block" />
        <div className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-white/5 hidden sm:block" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Rapports
            </h1>
            <p className="text-xs sm:text-sm text-white/80">
              Rapports d&apos;activites, recommandations et pointages
            </p>
          </div>
        </div>
      </div>

      <RapportsClient
        antennes={filterOptions.antennes}
        projets={filterOptions.projets}
        initialActiviteData={JSON.parse(JSON.stringify(activiteData))}
        initialRecommandationData={JSON.parse(JSON.stringify(recommandationData))}
        initialPointageData={JSON.parse(JSON.stringify(pointageData))}
        initialPerformanceData={JSON.parse(JSON.stringify(performanceData))}
      />
    </div>
  );
}
