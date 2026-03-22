import { redirect } from "next/navigation";
import { Plane, Construction } from "lucide-react";
import { getSessionUser } from "@/lib/actions/auth.actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Missions | TRACKER-AIBEF" };

export default async function MissionsPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  if (session.role === "VOLONTAIRE" || session.role === "MAJ") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-r from-indigo-500 to-blue-600 p-4 sm:p-6 text-white shadow-md sm:shadow-lg">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10 hidden sm:block" />
        <div className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-white/5 hidden sm:block" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <Plane className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Missions</h1>
            <p className="text-xs sm:text-sm text-white/80">Gestion des ordres de mission</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-16 text-center">
        <Construction className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-lg font-semibold">Module en cours de developpement</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          Le module de gestion des missions est en cours de developpement et sera disponible prochainement.
        </p>
      </div>
    </div>
  );
}
