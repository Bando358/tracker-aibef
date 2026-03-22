import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/actions/auth.actions";
import { getTodayPointage, getPointagesByAntenne } from "@/lib/actions/pointage.actions";
import { PointageWrapper } from "@/components/pointages/pointage-wrapper";
import { PointageManagerClient } from "@/components/pointages/pointage-manager-client";
import { Clock } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function PointagesPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  // Les VOLONTAIRE et MAJ ne font pas de pointage
  if (session.role === "VOLONTAIRE" || session.role === "MAJ") {
    redirect("/dashboard");
  }

  const isManager =
    session.role === "SUPER_ADMIN" ||
    session.role === "ADMIN_SIMPLE" ||
    session.role === "RESPONSABLE_ANTENNE" ||
    session.role === "ADMIN_ANTENNE";

  const apiKey = process.env.NEXT_PUBLIC_FINGERPRINT_API_KEY ?? "";

  // Vue employe
  if (!isManager) {
    const todayPointage = await getTodayPointage(session.id);

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 p-4 sm:p-6 text-white shadow-md sm:shadow-lg sm:shadow-sky-500/25">
          <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10 hidden sm:block" />
          <div className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-white/5 hidden sm:block" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Mes pointages</h1>
              <p className="text-xs sm:text-sm text-white/80">
                Gerez vos pointages quotidiens
              </p>
            </div>
          </div>
        </div>

        <PointageWrapper
          userId={session.id}
          todayPointage={
            todayPointage
              ? {
                  id: todayPointage.id,
                  heureArrivee: todayPointage.heureArrivee,
                  pauseDebut: todayPointage.pauseDebut,
                  pauseFin: todayPointage.pauseFin,
                  heureDepart: todayPointage.heureDepart,
                  totalHeures: todayPointage.totalHeures,
                  statut: todayPointage.statut,
                  retardMinutes: todayPointage.retardMinutes,
                }
              : null
          }
          antenneId={session.antenneId}
          apiKey={apiKey}
        />
      </div>
    );
  }

  // Vue manager - saisie du cahier de pointage
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  let antenneEmployees: Array<{
    id: string;
    nom: string;
    prenom: string;
    role: string;
    pointage: {
      id: string;
      heureArrivee: Date | null;
      pauseDebut: Date | null;
      pauseFin: Date | null;
      heureDepart: Date | null;
      totalHeures: number;
      statut: string;
      retardMinutes: number;
    } | null;
  }> = [];

  if (session.role === "SUPER_ADMIN" || session.role === "ADMIN_SIMPLE") {
    antenneEmployees = await getPointagesByAntenne(null, today);
  } else if (session.antenneId) {
    antenneEmployees = await getPointagesByAntenne(session.antenneId, today);
  }

  const serializedEmployees = JSON.parse(JSON.stringify(antenneEmployees));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 p-4 sm:p-6 text-white shadow-md sm:shadow-lg sm:shadow-sky-500/25">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10 hidden sm:block" />
        <div className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-white/5 hidden sm:block" />
        <div className="absolute right-12 top-3 h-2.5 w-2.5 rounded-full bg-white/20 hidden sm:block" />
        <div className="absolute right-[7rem] top-8 h-1.5 w-1.5 rounded-full bg-white/15 hidden sm:block" />
        <div className="absolute left-1/3 -top-8 h-24 w-24 rounded-full bg-white/[0.07] hidden sm:block" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <Clock className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Cahier de pointage</h1>
            <p className="text-xs sm:text-sm text-white/80">
              Saisie des presences du personnel
              {session.antenneName ? ` - ${session.antenneName}` : ""}
            </p>
          </div>
        </div>
      </div>

      <PointageManagerClient
        employees={serializedEmployees}
        currentUserId={session.id}
        antenneName={session.antenneName ?? "Toutes les antennes"}
      />
    </div>
  );
}
