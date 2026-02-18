import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/actions/auth.actions";
import { getCongeBalance } from "@/lib/actions/conge.actions";
import { CongeForm } from "@/components/conges/conge-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CalendarDays } from "lucide-react";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function NouveauCongePage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const currentYear = new Date().getFullYear();
  const balance = await getCongeBalance(session.id, currentYear);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/conges">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nouvelle demande de conge</h1>
          <p className="text-muted-foreground">
            Remplissez le formulaire pour creer votre demande
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <CongeForm />

        {/* Panneau d'information du solde */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="h-4 w-4" />
                Solde de conges {currentYear}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Droits annuels
                </span>
                <span className="font-medium">{balance.totalDays} jours</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Utilises
                </span>
                <span className="font-medium text-green-600">
                  {balance.usedDays} jours
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  En attente
                </span>
                <span className="font-medium text-amber-600">
                  {balance.pendingDays} jours
                </span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Restants</span>
                  <span className="text-lg font-bold text-red-600">
                    {balance.remainingDays} jours
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Information</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>
                  Les jours ouvres sont calcules automatiquement (hors
                  week-ends).
                </li>
                <li>
                  Vous pouvez enregistrer un brouillon et le soumettre plus
                  tard.
                </li>
                <li>
                  La demande doit etre approuvee par votre responsable puis par
                  l&apos;administration.
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
