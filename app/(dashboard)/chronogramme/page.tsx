import { redirect } from "next/navigation";
import { GanttChart } from "lucide-react";
import { getSessionUser } from "@/lib/actions/auth.actions";
import { fetchChronogrammeData } from "@/lib/actions/chronogramme.actions";
import { fetchRapportFilterOptions } from "@/lib/actions/rapport.actions";
import { ChronogrammeClient } from "@/components/chronogramme/chronogramme-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Chronogramme | TRACKER-AIBEF" };

export default async function ChronogrammePage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  if (!["SUPER_ADMIN", "ADMIN_SIMPLE", "RESPONSABLE_ANTENNE", "ADMIN_ANTENNE"].includes(session.role)) {
    redirect("/dashboard");
  }

  const year = new Date().getFullYear();
  const [data, options] = await Promise.all([
    fetchChronogrammeData(year),
    fetchRapportFilterOptions(),
  ]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-600 p-4 sm:p-6 text-white shadow-md sm:shadow-lg">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10 hidden sm:block" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <GanttChart className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Chronogramme</h1>
            <p className="text-xs sm:text-sm text-white/80">Planification et suivi des activites</p>
          </div>
        </div>
      </div>

      <ChronogrammeClient
        initialData={JSON.parse(JSON.stringify(data))}
        antennes={options.antennes}
        projets={options.projets}
        initialYear={year}
      />
    </div>
  );
}
