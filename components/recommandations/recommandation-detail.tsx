"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StatutRecommandationType } from "@/types";
import {
  updateRecommandationStatut,
  resolveRecommandation,
  deleteRecommandation,
} from "@/lib/actions/recommandation.actions";
import {
  STATUT_RECOMMANDATION_LABELS,
  PRIORITE_LABELS,
} from "@/lib/constants";
import { formatDateFr, formatDateTimeFr } from "@/lib/date-utils";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Clock,
  CheckCircle2,
  Loader2,
  Trash2,
  History,
  FileText,
  Star,
} from "lucide-react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RecommandationDetailData {
  id: string;
  titre: string;
  description: string;
  source: string;
  typeResolution: string;
  statut: StatutRecommandationType;
  priorite: string;
  dateEcheance: Date;
  dateResolution: Date | null;
  frequence: string | null;
  observations: string | null;
  createdAt: Date;
  updatedAt: Date;
  activite: { id: string; titre: string } | null;
  antenne: { id: string; nom: string } | null;
  responsables: {
    id: string;
    isPrincipal: boolean;
    user: { id: string; nom: string; prenom: string; email: string };
  }[];
  historiques: {
    id: string;
    createdAt: Date;
    ancienStatut: StatutRecommandationType;
    nouveauStatut: StatutRecommandationType;
    commentaire: string | null;
    modifiePar: string;
  }[];
}

interface RecommandationDetailProps {
  recommandation: RecommandationDetailData;
}

// ---------------------------------------------------------------------------
// Label maps
// ---------------------------------------------------------------------------

const SOURCE_LABELS: Record<string, string> = {
  ACTIVITE: "Activite",
  REUNION: "Reunion",
  SUPERVISION: "Supervision",
  FORMATION: "Formation",
};

const TYPE_RESOLUTION_LABELS: Record<string, string> = {
  PERMANENTE: "Permanente",
  PONCTUELLE: "Ponctuelle",
  PERIODIQUE: "Periodique",
};

const FREQUENCE_LABELS: Record<string, string> = {
  MENSUELLE: "Mensuelle",
  TRIMESTRIELLE: "Trimestrielle",
  ANNUELLE: "Annuelle",
};

const AVAILABLE_STATUTS: {
  value: StatutRecommandationType;
  label: string;
}[] = [
  { value: "EN_ATTENTE", label: "En attente" },
  { value: "EN_COURS", label: "En cours" },
  { value: "PARTIELLEMENT_REALISEE", label: "Partiellement realisee" },
  { value: "ANNULEE", label: "Annulee" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RecommandationDetail({
  recommandation,
}: RecommandationDetailProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [showResolveForm, setShowResolveForm] = useState(false);
  const [resolveObservations, setResolveObservations] = useState("");
  const [newStatut, setNewStatut] = useState<StatutRecommandationType | "">("");
  const [statutComment, setStatutComment] = useState("");

  const isTerminal =
    recommandation.statut === "RESOLUE" ||
    recommandation.statut === "ANNULEE";

  async function handleStatusChange() {
    if (!newStatut) {
      toast.error("Veuillez selectionner un statut");
      return;
    }

    setIsUpdating(true);
    try {
      const result = await updateRecommandationStatut(
        recommandation.id,
        newStatut,
        statutComment || undefined
      );
      if (result.success) {
        toast.success("Statut mis a jour avec succes");
        setNewStatut("");
        setStatutComment("");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Erreur lors de la mise a jour du statut");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleResolve() {
    if (!resolveObservations.trim()) {
      toast.error("Veuillez saisir des observations pour la resolution");
      return;
    }

    setIsResolving(true);
    try {
      const result = await resolveRecommandation(
        recommandation.id,
        resolveObservations
      );
      if (result.success) {
        toast.success("Recommandation resolue avec succes");
        setShowResolveForm(false);
        setResolveObservations("");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Erreur lors de la resolution");
    } finally {
      setIsResolving(false);
    }
  }

  async function handleDelete() {
    const result = await deleteRecommandation(recommandation.id);
    if (result.success) {
      toast.success("Recommandation supprimee avec succes");
      router.push("/recommandations");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/recommandations">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {recommandation.titre}
            </h1>
            <p className="text-sm text-muted-foreground">
              Creee le {formatDateFr(recommandation.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge
            status={recommandation.statut}
            label={STATUT_RECOMMANDATION_LABELS[recommandation.statut]}
          />
          <StatusBadge
            status={recommandation.priorite}
            label={PRIORITE_LABELS[recommandation.priorite]}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Description</Label>
                <p className="mt-1 whitespace-pre-wrap">
                  {recommandation.description}
                </p>
              </div>

              <Separator />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground">Source</Label>
                  <p className="mt-1">
                    {SOURCE_LABELS[recommandation.source] ?? recommandation.source}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">
                    Type de resolution
                  </Label>
                  <p className="mt-1">
                    {TYPE_RESOLUTION_LABELS[recommandation.typeResolution] ??
                      recommandation.typeResolution}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-muted-foreground">
                      Date d&apos;echeance
                    </Label>
                    <p className="mt-1">
                      {formatDateFr(recommandation.dateEcheance)}
                    </p>
                  </div>
                </div>
                {recommandation.dateResolution && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <div>
                      <Label className="text-muted-foreground">
                        Date de resolution
                      </Label>
                      <p className="mt-1">
                        {formatDateFr(recommandation.dateResolution)}
                      </p>
                    </div>
                  </div>
                )}
                {recommandation.frequence && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label className="text-muted-foreground">Frequence</Label>
                      <p className="mt-1">
                        {FREQUENCE_LABELS[recommandation.frequence] ??
                          recommandation.frequence}
                      </p>
                    </div>
                  </div>
                )}
                {recommandation.antenne && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label className="text-muted-foreground">Antenne</Label>
                      <p className="mt-1">{recommandation.antenne.nom}</p>
                    </div>
                  </div>
                )}
                {recommandation.activite && (
                  <div>
                    <Label className="text-muted-foreground">
                      Activite liee
                    </Label>
                    <p className="mt-1">{recommandation.activite.titre}</p>
                  </div>
                )}
              </div>

              {recommandation.observations && (
                <>
                  <Separator />
                  <div>
                    <Label className="text-muted-foreground">
                      Observations
                    </Label>
                    <p className="mt-1 whitespace-pre-wrap">
                      {recommandation.observations}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Responsables Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Responsables ({recommandation.responsables.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recommandation.responsables.map((resp) => (
                  <div
                    key={resp.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                        {resp.user.prenom[0]}
                        {resp.user.nom[0]}
                      </div>
                      <div>
                        <p className="font-medium">
                          {resp.user.prenom} {resp.user.nom}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {resp.user.email}
                        </p>
                      </div>
                    </div>
                    {resp.isPrincipal && (
                      <Badge
                        variant="outline"
                        className="border-amber-200 bg-amber-50 text-amber-700"
                      >
                        <Star className="mr-1 h-3 w-3" />
                        Principal
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* History Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Historique
              </CardTitle>
              <CardDescription>
                Suivi des changements de statut de la recommandation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recommandation.historiques.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun historique disponible.
                </p>
              ) : (
                <div className="relative space-y-0">
                  {recommandation.historiques.map((entry, index) => (
                    <div key={entry.id} className="relative flex gap-4 pb-6">
                      {/* Timeline line */}
                      {index < recommandation.historiques.length - 1 && (
                        <div className="absolute left-[11px] top-6 h-full w-px bg-border" />
                      )}
                      {/* Timeline dot */}
                      <div className="relative z-10 mt-1.5 h-[10px] w-[10px] flex-shrink-0 rounded-full border-2 border-primary bg-background" />
                      {/* Content */}
                      <div className="flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge
                            status={entry.ancienStatut}
                            label={
                              STATUT_RECOMMANDATION_LABELS[
                                entry.ancienStatut
                              ]
                            }
                            className="text-xs"
                          />
                          <span className="text-xs text-muted-foreground">
                            &rarr;
                          </span>
                          <StatusBadge
                            status={entry.nouveauStatut}
                            label={
                              STATUT_RECOMMANDATION_LABELS[
                                entry.nouveauStatut
                              ]
                            }
                            className="text-xs"
                          />
                        </div>
                        {entry.commentaire && (
                          <p className="text-sm text-muted-foreground">
                            {entry.commentaire}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {formatDateTimeFr(entry.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar actions */}
        <div className="space-y-6">
          {/* Status change controls */}
          {!isTerminal && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Changer le statut
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nouveau statut</Label>
                  <Select
                    value={newStatut}
                    onValueChange={(v) =>
                      setNewStatut(v as StatutRecommandationType)
                    }
                    disabled={isUpdating}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selectionner un statut" />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_STATUTS.filter(
                        (s) => s.value !== recommandation.statut
                      ).map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Commentaire (optionnel)</Label>
                  <Textarea
                    value={statutComment}
                    onChange={(e) => setStatutComment(e.target.value)}
                    placeholder="Raison du changement de statut..."
                    rows={3}
                    disabled={isUpdating}
                  />
                </div>

                <Button
                  onClick={handleStatusChange}
                  disabled={isUpdating || !newStatut}
                  className="w-full"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Mise a jour...
                    </>
                  ) : (
                    "Mettre a jour le statut"
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Resolve button / form */}
          {!isTerminal && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Resoudre
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!showResolveForm ? (
                  <Button
                    variant="outline"
                    className="w-full border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
                    onClick={() => setShowResolveForm(true)}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Marquer comme resolue
                  </Button>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Observations de resolution *</Label>
                      <Textarea
                        value={resolveObservations}
                        onChange={(e) =>
                          setResolveObservations(e.target.value)
                        }
                        placeholder="Decrivez comment la recommandation a ete resolue..."
                        rows={4}
                        disabled={isResolving}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleResolve}
                        disabled={
                          isResolving || !resolveObservations.trim()
                        }
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        {isResolving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Resolution...
                          </>
                        ) : (
                          "Confirmer la resolution"
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowResolveForm(false);
                          setResolveObservations("");
                        }}
                        disabled={isResolving}
                      >
                        Annuler
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Delete action */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-destructive">
                Zone de danger
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ConfirmDialog
                trigger={
                  <Button variant="destructive" className="w-full">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer la recommandation
                  </Button>
                }
                title="Supprimer la recommandation"
                description={`Etes-vous sur de vouloir supprimer la recommandation "${recommandation.titre}" ? Cette action est irreversible et supprimera egalement tout l'historique associe.`}
                confirmLabel="Supprimer definitivement"
                onConfirm={handleDelete}
                variant="destructive"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
