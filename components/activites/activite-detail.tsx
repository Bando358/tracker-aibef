"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Users,
  DollarSign,
  Loader2,
  History,
  FolderOpen,
} from "lucide-react";
import { updateActiviteStatut } from "@/lib/actions/activite.actions";
import { STATUT_ACTIVITE_LABELS } from "@/lib/constants";
import { formatDateFr, formatDateTimeFr } from "@/lib/date-utils";
import type { StatutActiviteType } from "@/types";

import { ActiviteStatusBadge } from "@/components/activites/activite-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
interface ActiviteAntenneWithRelations {
  id: string;
  antenneId: string;
  responsableId: string;
  statut: StatutActiviteType;
  antenne: { id: string; nom: string; code: string };
  responsable: { id: string; nom: string; prenom: string; email: string };
}

interface ActiviteHistoriqueData {
  id: string;
  ancienStatut: StatutActiviteType;
  nouveauStatut: StatutActiviteType;
  commentaire: string | null;
  modifiePar: string;
  createdAt: Date;
}

interface RecommandationData {
  id: string;
  titre: string;
  statut: string;
}

interface ActiviteDetailData {
  id: string;
  titre: string;
  description: string | null;
  type: string;
  frequence: string | null;
  statut: StatutActiviteType;
  dateDebut: Date | null;
  dateFin: Date | null;
  dateRealisee: Date | null;
  budget: number | null;
  projetId: string | null;
  activiteAntennes: ActiviteAntenneWithRelations[];
  historiques: ActiviteHistoriqueData[];
  recommandations: RecommandationData[];
  createur: { id: string; nom: string; prenom: string; email: string };
  projet: { id: string; nom: string } | null;
}

interface ActiviteDetailProps {
  activite: ActiviteDetailData;
}

// ------------------------------------------------------------------
// Status options for transitions
// ------------------------------------------------------------------
const STATUT_OPTIONS: StatutActiviteType[] = [
  "PLANIFIEE",
  "EN_COURS",
  "REALISEE",
  "EN_RETARD",
  "ANNULEE",
  "REPROGRAMMEE",
];

// ------------------------------------------------------------------
// Component
// ------------------------------------------------------------------
export function ActiviteDetail({ activite }: ActiviteDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newStatut, setNewStatut] = useState<StatutActiviteType | "">("");
  const [commentaire, setCommentaire] = useState("");

  function handleStatutChange() {
    if (!newStatut) {
      toast.error("Veuillez selectionner un statut");
      return;
    }

    startTransition(async () => {
      const result = await updateActiviteStatut(
        activite.id,
        newStatut as StatutActiviteType,
        commentaire || undefined
      );

      if (result.success) {
        toast.success("Statut mis a jour avec succes");
        setNewStatut("");
        setCommentaire("");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header avec navigation */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/activites">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{activite.titre}</h1>
          <p className="text-sm text-muted-foreground">
            Creee par {activite.createur.prenom} {activite.createur.nom}
          </p>
        </div>
        <ActiviteStatusBadge statut={activite.statut} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ============================================================ */}
        {/* Colonne principale (2/3)                                     */}
        {/* ============================================================ */}
        <div className="space-y-6 lg:col-span-2">
          {/* Informations generales */}
          <Card>
            <CardHeader>
              <CardTitle>Informations generales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {activite.description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Description
                  </p>
                  <p className="mt-1">{activite.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="flex items-start gap-2">
                  <CalendarDays className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Date debut
                    </p>
                    <p className="text-sm">{formatDateFr(activite.dateDebut)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CalendarDays className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Date fin
                    </p>
                    <p className="text-sm">{formatDateFr(activite.dateFin)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Type
                    </p>
                    <p className="text-sm">
                      {activite.type === "PONCTUELLE"
                        ? "Ponctuelle"
                        : "Periodique"}
                    </p>
                  </div>
                </div>
                {activite.frequence && (
                  <div className="flex items-start gap-2">
                    <Clock className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Frequence
                      </p>
                      <p className="text-sm capitalize">
                        {activite.frequence.toLowerCase()}
                      </p>
                    </div>
                  </div>
                )}
                {activite.budget != null && (
                  <div className="flex items-start gap-2">
                    <DollarSign className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Budget
                      </p>
                      <p className="text-sm">
                        {new Intl.NumberFormat("fr-FR").format(activite.budget)}{" "}
                        FCFA
                      </p>
                    </div>
                  </div>
                )}
                {activite.projet && (
                  <div className="flex items-start gap-2">
                    <FolderOpen className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Projet
                      </p>
                      <p className="text-sm">{activite.projet.nom}</p>
                    </div>
                  </div>
                )}
                {activite.dateRealisee && (
                  <div className="flex items-start gap-2">
                    <CalendarDays className="mt-0.5 h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Date realisation
                      </p>
                      <p className="text-sm">
                        {formatDateFr(activite.dateRealisee)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Antennes affectees */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Antennes affectees ({activite.activiteAntennes.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activite.activiteAntennes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune antenne affectee.
                </p>
              ) : (
                <div className="space-y-3">
                  {activite.activiteAntennes.map((aa: ActiviteAntenneWithRelations) => (
                    <div
                      key={aa.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">
                          {aa.antenne.nom}{" "}
                          <span className="text-xs text-muted-foreground">
                            ({aa.antenne.code})
                          </span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Responsable : {aa.responsable.prenom}{" "}
                          {aa.responsable.nom}
                        </p>
                      </div>
                      <ActiviteStatusBadge statut={aa.statut} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Historique */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Historique
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activite.historiques.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun historique.
                </p>
              ) : (
                <div className="relative space-y-0">
                  {activite.historiques.map((h: ActiviteHistoriqueData, index: number) => (
                    <div key={h.id} className="flex gap-4 pb-6">
                      {/* Timeline line */}
                      <div className="flex flex-col items-center">
                        <div className="h-3 w-3 rounded-full border-2 border-primary bg-background" />
                        {index < activite.historiques.length - 1 && (
                          <div className="w-px flex-1 bg-border" />
                        )}
                      </div>
                      {/* Content */}
                      <div className="-mt-0.5 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <ActiviteStatusBadge statut={h.ancienStatut} />
                          <span className="text-sm text-muted-foreground">
                            &rarr;
                          </span>
                          <ActiviteStatusBadge statut={h.nouveauStatut} />
                        </div>
                        {h.commentaire && (
                          <p className="text-sm">{h.commentaire}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {formatDateTimeFr(h.createdAt)}
                          {h.modifiePar !== "SYSTEME" && (
                            <> &middot; Par {h.modifiePar}</>
                          )}
                          {h.modifiePar === "SYSTEME" && (
                            <> &middot; Detection automatique</>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ============================================================ */}
        {/* Colonne laterale (1/3)                                       */}
        {/* ============================================================ */}
        <div className="space-y-6">
          {/* Changement de statut */}
          <Card>
            <CardHeader>
              <CardTitle>Changer le statut</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">
                  Statut actuel
                </p>
                <ActiviteStatusBadge statut={activite.statut} />
              </div>

              <Separator />

              <div className="space-y-3">
                <Select
                  value={newStatut}
                  onValueChange={(v) => setNewStatut(v as StatutActiviteType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Nouveau statut" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUT_OPTIONS.filter((s) => s !== activite.statut).map(
                      (s) => (
                        <SelectItem key={s} value={s}>
                          {STATUT_ACTIVITE_LABELS[s] ?? s}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>

                <Textarea
                  placeholder="Commentaire (optionnel)"
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  rows={3}
                />

                <Button
                  onClick={handleStatutChange}
                  disabled={isPending || !newStatut}
                  className="w-full"
                >
                  {isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Mettre a jour
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recommandations liees */}
          {activite.recommandations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  Recommandations ({activite.recommandations.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {activite.recommandations.map((r: RecommandationData) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between rounded-lg border p-2"
                    >
                      <p className="text-sm font-medium truncate">
                        {r.titre}
                      </p>
                      <Badge variant="outline" className="ml-2 shrink-0">
                        {r.statut.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
