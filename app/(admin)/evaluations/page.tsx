import { redirect } from "next/navigation";
import { Star } from "lucide-react";
import { getSessionUser } from "@/lib/actions/auth.actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Evaluations | TRACKER-AIBEF" };

export default async function EvaluationsPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  if (!["SUPER_ADMIN", "ADMIN_SIMPLE", "RESPONSABLE_ANTENNE", "ADMIN_ANTENNE"].includes(session.role)) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 p-4 sm:p-6 text-white shadow-md sm:shadow-lg">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10 hidden sm:block" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <Star className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Evaluations</h1>
            <p className="text-xs sm:text-sm text-white/80">Evaluation de la performance du personnel</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 p-12 text-center text-muted-foreground">
        <Star className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p className="font-medium">Module Evaluations</p>
        <p className="text-sm mt-1">Les evaluations de performance seront disponibles prochainement.</p>
      </div>
    </div>
  );
}
