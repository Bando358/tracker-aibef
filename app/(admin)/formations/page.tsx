import { redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { getSessionUser } from "@/lib/actions/auth.actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Formations | TRACKER-AIBEF" };

export default async function FormationsPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  if (!["SUPER_ADMIN", "ADMIN_SIMPLE", "RESPONSABLE_ANTENNE", "ADMIN_ANTENNE"].includes(session.role)) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 p-4 sm:p-6 text-white shadow-md sm:shadow-lg">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10 hidden sm:block" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Formations</h1>
            <p className="text-xs sm:text-sm text-white/80">Suivi des formations et renforcement des capacites</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 p-12 text-center text-muted-foreground">
        <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p className="font-medium">Module Formations</p>
        <p className="text-sm mt-1">Le suivi des formations sera disponible prochainement.</p>
      </div>
    </div>
  );
}
