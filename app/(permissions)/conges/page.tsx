import { redirect } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { getSessionUser } from "@/lib/actions/auth.actions";
import { CongeList } from "@/components/conges/conge-list";

export const dynamic = 'force-dynamic';

export default async function CongesPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  // Les VOLONTAIRE et MAJ n'ont pas acces aux conges
  if (session.role === "VOLONTAIRE" || session.role === "MAJ") {
    redirect("/dashboard");
  }

  const isManager =
    session.role === "SUPER_ADMIN" ||
    session.role === "ADMIN_SIMPLE" ||
    session.role === "RESPONSABLE_ANTENNE" ||
    session.role === "ADMIN_ANTENNE";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 p-6 text-white shadow-lg shadow-emerald-500/25">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-white/5" />
        <div className="absolute right-12 top-3 h-2.5 w-2.5 rounded-full bg-white/20" />
        <div className="absolute right-[7rem] top-8 h-1.5 w-1.5 rounded-full bg-white/15" />
        <div className="absolute left-1/3 -top-8 h-24 w-24 rounded-full bg-white/[0.07]" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <CalendarDays className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Gestion des conges</h1>
            <p className="text-sm text-white/80">
              {isManager
                ? "Gerez vos demandes et approuvez celles de votre equipe"
                : "Consultez et gerez vos demandes de conge"}
            </p>
          </div>
        </div>
      </div>

      <CongeList
        userId={session.id}
        userRole={session.role}
        showApprovalTab={isManager}
      />
    </div>
  );
}
