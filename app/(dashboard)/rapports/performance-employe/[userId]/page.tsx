import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { getSessionUser } from "@/lib/actions/auth.actions";
import { fetchPerformanceEmployeDetail } from "@/lib/actions/rapport.actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { STATUT_ACTIVITE_LABELS, ROLE_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ userId: string }> }

export default async function PerformanceEmployePage({ params }: Props) {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  const { userId } = await params;

  const data = await fetchPerformanceEmployeDetail(userId);
  if (!data) notFound();

  const { employe, activites, stats } = data;

  return (
    <div className="space-y-6 animate-fade-in overflow-x-hidden">
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 p-4 sm:p-6 text-white shadow-md">
        <div className="relative flex items-center gap-3">
          <Button variant="outline" size="icon" asChild className="shrink-0 rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
            <Link href="/rapports"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{employe.prenom} {employe.nom}</h1>
            <p className="text-xs text-white/80">{ROLE_LABELS[employe.role] ?? employe.role} {employe.antenne ? `- ${employe.antenne}` : ""}</p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-xl border p-3 text-center">
          <p className="text-2xl font-bold">{stats.activitesAssignees}</p>
          <p className="text-[10px] text-muted-foreground">Activites</p>
        </div>
        <div className="rounded-xl border p-3 text-center">
          <p className="text-2xl font-bold">{stats.totalPeriodes}</p>
          <p className="text-[10px] text-muted-foreground">Periodes</p>
        </div>
        <div className="rounded-xl border p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.periodesRealisees}</p>
          <p className="text-[10px] text-muted-foreground">Realisees</p>
        </div>
        <div className="rounded-xl border p-3 text-center">
          <p className="text-2xl font-bold text-red-600">{stats.periodesEnRetard}</p>
          <p className="text-[10px] text-muted-foreground">En retard</p>
        </div>
        <div className="rounded-xl border p-3 text-center col-span-2 sm:col-span-1">
          <p className={`text-2xl font-bold ${stats.tauxRealisation >= 80 ? "text-green-600" : stats.tauxRealisation >= 50 ? "text-amber-600" : "text-red-600"}`}>
            {stats.tauxRealisation}%
          </p>
          <p className="text-[10px] text-muted-foreground">Taux realisation</p>
        </div>
      </div>

      {/* Detail activites */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Activites assignees ({activites.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-3 py-2 text-left font-semibold">Activite</th>
                  <th className="px-3 py-2 text-left font-semibold">Antenne</th>
                  <th className="px-3 py-2 text-left font-semibold">Statut</th>
                  <th className="px-3 py-2 text-right font-semibold">Periodes</th>
                  <th className="px-3 py-2 text-right font-semibold">Realisees</th>
                  <th className="px-3 py-2 text-right font-semibold">En retard</th>
                  <th className="px-3 py-2 text-right font-semibold">Taux</th>
                </tr>
              </thead>
              <tbody>
                {activites.map((a, i) => {
                  const taux = a.totalPeriodes > 0 ? Math.round((a.periodesRealisees / a.totalPeriodes) * 100) : 0;
                  return (
                    <tr key={i} className="border-b hover:bg-muted/20">
                      <td className="px-3 py-2">
                        <Link href={`/activites/${a.id}`} className="font-medium text-primary hover:underline">
                          {a.titre}
                        </Link>
                      </td>
                      <td className="px-3 py-2">{a.antenne}</td>
                      <td className="px-3 py-2"><StatusBadge status={a.statut} label={STATUT_ACTIVITE_LABELS[a.statut]} /></td>
                      <td className="px-3 py-2 text-right tabular-nums">{a.totalPeriodes}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-green-600">{a.periodesRealisees}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-red-600">{a.periodesEnRetard}</td>
                      <td className="px-3 py-2 text-right">
                        <Badge variant="outline" className={`text-xs tabular-nums ${taux >= 80 ? "text-green-600" : taux >= 50 ? "text-amber-600" : "text-red-600"}`}>
                          {taux}%
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
                {activites.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">Aucune activite assignee</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
