import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { getSessionUser } from "@/lib/actions/auth.actions";
import { getMissionById } from "@/lib/actions/mission.actions";
import { MissionForm } from "@/components/missions/mission-form";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ id: string }> }

export default async function ModifierMissionPage({ params }: Props) {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  const { id } = await params;

  if (!["SUPER_ADMIN", "ADMIN_SIMPLE", "RESPONSABLE_ANTENNE", "ADMIN_ANTENNE"].includes(session.role)) {
    redirect(`/missions/${id}`);
  }

  const mission = await getMissionById(id);
  if (!mission) notFound();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-r from-indigo-500 to-blue-600 p-4 sm:p-6 text-white shadow-md">
        <div className="relative flex items-center gap-3">
          <Button variant="outline" size="icon" asChild className="shrink-0 rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
            <Link href={`/missions/${id}`}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <Pencil className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Modifier la mission</h1>
            <p className="text-xs sm:text-sm text-white/80 truncate">{mission.objet}</p>
          </div>
        </div>
      </div>

      <MissionForm
        initialData={{
          id: mission.id,
          objet: mission.objet,
          lieu: mission.lieu,
          dateDebut: mission.dateDebut,
          dateFin: mission.dateFin,
          perDiem: mission.perDiem,
          responsableId: mission.responsableId,
          observations: mission.observations,
        }}
      />
    </div>
  );
}
