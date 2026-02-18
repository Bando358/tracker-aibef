import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/actions/auth.actions";
import { getTodayPointage, getPointagesByAntenne } from "@/lib/actions/pointage.actions";
import { PointageForm } from "@/components/pointages/pointage-form";
import { PointageList } from "@/components/pointages/pointage-list";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatTimeFr, formatDateFr } from "@/lib/date-utils";
import { ROLE_LABELS } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Users, Eye } from "lucide-react";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function PointagesPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const isManager =
    session.role === "SUPER_ADMIN" ||
    session.role === "RESPONSABLE_ANTENNE";

  // Vue employe: son propre pointage
  if (!isManager) {
    const todayPointage = await getTodayPointage(session.id);

    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Mes pointages</h1>
          <p className="text-muted-foreground">
            Gerez vos pointages quotidiens
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
          <PointageForm
            userId={session.id}
            todayPointage={
              todayPointage
                ? {
                    id: todayPointage.id,
                    heureArrivee: todayPointage.heureArrivee,
                    heureDepart: todayPointage.heureDepart,
                    statut: todayPointage.statut,
                    retardMinutes: todayPointage.retardMinutes,
                  }
                : null
            }
          />
          <div>
            <PointageList userId={session.id} />
          </div>
        </div>
      </div>
    );
  }

  // Vue manager: vue d'ensemble de l'antenne + propre pointage
  const todayPointage = await getTodayPointage(session.id);
  const today = new Date().toISOString().split("T")[0];

  // Recuperer les pointages de l'antenne (ou toutes si SUPER_ADMIN)
  let antenneEmployees: Array<{
    id: string;
    nom: string;
    prenom: string;
    role: string;
    pointage: {
      id: string;
      heureArrivee: Date | null;
      heureDepart: Date | null;
      statut: string;
      retardMinutes: number;
    } | null;
  }> = [];

  if (session.antenneId) {
    antenneEmployees = await getPointagesByAntenne(session.antenneId, today);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Gestion des pointages</h1>
        <p className="text-muted-foreground">
          Vue d&apos;ensemble des pointages
          {session.antenneName ? ` - ${session.antenneName}` : ""}
        </p>
      </div>

      {/* Formulaire personnel du manager */}
      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <PointageForm
          userId={session.id}
          todayPointage={
            todayPointage
              ? {
                  id: todayPointage.id,
                  heureArrivee: todayPointage.heureArrivee,
                  heureDepart: todayPointage.heureDepart,
                  statut: todayPointage.statut,
                  retardMinutes: todayPointage.retardMinutes,
                }
              : null
          }
        />

        {/* Vue d'ensemble antenne - aujourd'hui */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Pointages du jour - {formatDateFr(new Date())}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {antenneEmployees.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Aucun employe dans cette antenne
              </p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employe</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Arrivee</TableHead>
                      <TableHead>Depart</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Retard</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {antenneEmployees.map((emp) => (
                      <TableRow key={emp.id}>
                        <TableCell className="font-medium">
                          {emp.prenom} {emp.nom}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {ROLE_LABELS[emp.role] ?? emp.role}
                        </TableCell>
                        <TableCell>
                          {emp.pointage?.heureArrivee
                            ? formatTimeFr(emp.pointage.heureArrivee)
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {emp.pointage?.heureDepart
                            ? formatTimeFr(emp.pointage.heureDepart)
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {emp.pointage ? (
                            <StatusBadge status={emp.pointage.statut} />
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              Non pointe
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {emp.pointage && emp.pointage.retardMinutes > 0 ? (
                            <span className="text-amber-600 font-medium">
                              {emp.pointage.retardMinutes} min
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/pointages/${emp.id}`}>
                              <Eye className="h-4 w-4 mr-1" />
                              Voir
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Historique personnel */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Mon historique</h2>
        <PointageList userId={session.id} />
      </div>
    </div>
  );
}
