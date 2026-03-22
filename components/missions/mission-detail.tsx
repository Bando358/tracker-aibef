"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft, Plane, MapPin, CalendarDays, DollarSign,
  Users, Loader2, Pencil, FileText,
} from "lucide-react";

import { updateMissionStatut } from "@/lib/actions/mission.actions";
import { formatDateFr } from "@/lib/date-utils";
import { STATUT_MISSION_LABELS } from "@/lib/constants";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type StatutMissionType = "PLANIFIEE" | "EN_COURS" | "TERMINEE" | "ANNULEE";

const STATUT_OPTIONS: StatutMissionType[] = ["PLANIFIEE", "EN_COURS", "TERMINEE", "ANNULEE"];

interface MissionDetailData {
  id: string;
  objet: string;
  lieu: string;
  dateDebut: Date;
  dateFin: Date;
  perDiem: number | null;
  statut: string;
  observations: string | null;
  rapportMission: string | null;
  createdAt: Date;
  responsable: { id: string; nom: string; prenom: string; email: string };
  createur: { id: string; nom: string; prenom: string; email: string };
}

interface MissionDetailProps {
  mission: MissionDetailData;
}

export function MissionDetail({ mission }: MissionDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newStatut, setNewStatut] = useState<StatutMissionType | "">("");
  const [rapportMission, setRapportMission] = useState(mission.rapportMission ?? "");

  function handleStatutChange() {
    if (!newStatut) {
      toast.error("Veuillez selectionner un statut");
      return;
    }

    // Si on termine, le rapport est requis
    if (newStatut === "TERMINEE" && !rapportMission.trim()) {
      toast.error("Le rapport de mission est obligatoire pour terminer");
      return;
    }

    startTransition(async () => {
      const result = await updateMissionStatut(
        mission.id,
        newStatut as StatutMissionType,
        rapportMission || undefined
      );
      if (result.success) {
        toast.success("Statut mis a jour");
        setNewStatut("");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  // Calculer duree
  const dureeJours = Math.ceil(
    (new Date(mission.dateFin).getTime() - new Date(mission.dateDebut).getTime()) / 86400000
  ) + 1;

  return (
    <div className="space-y-6 animate-fade-in overflow-x-hidden">
      {/* Header */}
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-r from-indigo-500 to-blue-600 p-4 sm:p-6 text-white shadow-md">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10 hidden sm:block" />
        <div className="relative flex items-start sm:items-center gap-3 sm:gap-4">
          <Button variant="outline" size="icon" asChild className="shrink-0 rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
            <Link href="/missions"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 hidden sm:flex">
            <Plane className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <h1 className="text-lg sm:text-2xl font-bold tracking-tight truncate">{mission.objet}</h1>
              <StatusBadge status={mission.statut} label={STATUT_MISSION_LABELS[mission.statut]} />
            </div>
            <p className="text-xs sm:text-sm text-white/80 mt-0.5">
              Creee par {mission.createur.prenom} {mission.createur.nom}
            </p>
          </div>
          <Button variant="outline" size="sm" asChild className="shrink-0 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
            <Link href={`/missions/${mission.id}/modifier`}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Modifier
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Colonne principale */}
        <div className="space-y-6 lg:col-span-2 order-2 lg:order-1">
          {/* Informations */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2.5 text-base">
                <div className="rounded-xl bg-primary/10 p-1.5"><Plane className="h-4 w-4 text-primary" /></div>
                Informations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Lieu</p>
                    <p className="text-sm">{mission.lieu}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CalendarDays className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Debut</p>
                    <p className="text-sm">{formatDateFr(mission.dateDebut)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CalendarDays className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Fin</p>
                    <p className="text-sm">{formatDateFr(mission.dateFin)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CalendarDays className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Duree</p>
                    <p className="text-sm">{dureeJours} jour(s)</p>
                  </div>
                </div>
                {mission.perDiem != null && (
                  <div className="flex items-start gap-2">
                    <DollarSign className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Per diem</p>
                      <p className="text-sm">{new Intl.NumberFormat("fr-FR").format(mission.perDiem)} FCFA</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <Users className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Responsable</p>
                    <p className="text-sm">{mission.responsable.prenom} {mission.responsable.nom}</p>
                  </div>
                </div>
              </div>
              {mission.observations && (
                <div className="mt-4 border-t pt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Observations</p>
                  <p className="text-sm">{mission.observations}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rapport de mission */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2.5 text-base">
                <div className="rounded-xl bg-primary/10 p-1.5"><FileText className="h-4 w-4 text-primary" /></div>
                Rapport de mission
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mission.rapportMission ? (
                <div className="rounded-lg border p-4 bg-muted/20 whitespace-pre-wrap text-sm">
                  {mission.rapportMission}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Aucun rapport de mission soumis. Le rapport sera requis lors de la cloture de la mission.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Colonne laterale */}
        <div className="space-y-6 order-1 lg:order-2">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Changer le statut</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">Statut actuel</p>
                <StatusBadge status={mission.statut} label={STATUT_MISSION_LABELS[mission.statut]} />
              </div>
              <Separator />
              <div className="space-y-3">
                <Select value={newStatut} onValueChange={(v) => setNewStatut(v as StatutMissionType)}>
                  <SelectTrigger><SelectValue placeholder="Nouveau statut" /></SelectTrigger>
                  <SelectContent>
                    {STATUT_OPTIONS.filter((s) => s !== mission.statut).map((s) => (
                      <SelectItem key={s} value={s}>{STATUT_MISSION_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {newStatut === "TERMINEE" && (
                  <>
                    <Textarea
                      placeholder="Rapport de mission (obligatoire)"
                      value={rapportMission}
                      onChange={(e) => setRapportMission(e.target.value)}
                      rows={6}
                      className={!rapportMission.trim() ? "border-orange-400" : ""}
                    />
                    <p className="text-xs text-orange-600">
                      Le rapport de mission est obligatoire pour cloturer.
                    </p>
                  </>
                )}

                {newStatut && newStatut !== "TERMINEE" && (
                  <Textarea
                    placeholder="Commentaire (optionnel)"
                    value={rapportMission}
                    onChange={(e) => setRapportMission(e.target.value)}
                    rows={3}
                  />
                )}

                <Button
                  onClick={handleStatutChange}
                  disabled={isPending || !newStatut || (newStatut === "TERMINEE" && !rapportMission.trim())}
                  className="w-full"
                >
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Mettre a jour
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
