import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plane } from "lucide-react";
import { getSessionUser } from "@/lib/actions/auth.actions";
import { MissionForm } from "@/components/missions/mission-form";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nouvelle mission | TRACKER-AIBEF" };

export default async function NouvelleMissionPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  if (!["SUPER_ADMIN", "ADMIN_SIMPLE", "RESPONSABLE_ANTENNE", "ADMIN_ANTENNE"].includes(session.role)) {
    redirect("/missions");
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-r from-indigo-500 to-blue-600 p-4 sm:p-6 text-white shadow-md">
        <div className="relative flex items-center gap-3">
          <Button variant="outline" size="icon" asChild className="shrink-0 rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
            <Link href="/missions"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <Plane className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Nouvelle mission</h1>
            <p className="text-xs sm:text-sm text-white/80">Creer un ordre de mission</p>
          </div>
        </div>
      </div>

      <MissionForm />
    </div>
  );
}
