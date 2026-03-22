import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/actions/auth.actions";
import { getCongeBalance } from "@/lib/actions/conge.actions";
import { CongeForm } from "@/components/conges/conge-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CalendarDays, Info } from "lucide-react";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function NouveauCongePage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const currentYear = new Date().getFullYear();
  const balance = await getCongeBalance(session.id, currentYear);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 p-6 text-white shadow-lg shadow-emerald-500/25">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-white/5" />
        <div className="absolute right-12 top-3 h-2.5 w-2.5 rounded-full bg-white/20" />
        <div className="absolute right-[7rem] top-8 h-1.5 w-1.5 rounded-full bg-white/15" />
        <div className="absolute left-1/3 -top-8 h-24 w-24 rounded-full bg-white/[0.07]" />
        <div className="relative flex items-center gap-4">
          <Button variant="outline" size="icon" asChild className="shrink-0 rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
            <Link href="/conges">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <CalendarDays className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Nouvelle demande de conge</h1>
            <p className="text-sm text-white/80">
              Remplissez le formulaire pour creer votre demande
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <CongeForm />

        <div className="space-y-4">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2.5 text-base">
                <div className="rounded-xl bg-primary/10 p-1.5">
                  <CalendarDays className="h-4 w-4 text-primary" />
                </div>
                Solde de conges {currentYear}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Droits annuels</span>
                <span className="font-semibold tabular-nums">{balance.totalDays} jours</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Utilises</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {balance.usedDays} jours
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">En attente</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                  {balance.pendingDays} jours
                </span>
              </div>
              <div className="border-t border-border/60 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold">Restants</span>
                  <span className="text-lg font-bold text-primary tabular-nums">
                    {balance.remainingDays} jours
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2.5 text-base">
                <div className="rounded-xl bg-blue-100 p-1.5 dark:bg-blue-900/40">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                  Les jours ouvres sont calcules automatiquement (hors week-ends).
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                  Vous pouvez enregistrer un brouillon et le soumettre plus tard.
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                  La demande doit etre approuvee par votre responsable puis par l&apos;administration.
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
