"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
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
  Plus,
  Trash2,
  UserCheck,
  Pencil,
} from "lucide-react";
import {
  updateActiviteStatut,
  assignAntennesToActivite,
  removeAntenneFromActivite,
  updateAntenneResponsable,
  addPeriodeToActiviteAntenne,
  removePeriodeFromActiviteAntenne,
  updatePeriodeStatut,
} from "@/lib/actions/activite.actions";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getAllAntennes } from "@/lib/actions/antenne.actions";
import { getEmployesByAntenne } from "@/lib/actions/employe.actions";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
interface AntenneOption {
  id: string;
  nom: string;
  code: string;
}

interface EmployeOption {
  id: string;
  nom: string;
  prenom: string;
}

interface PeriodeData {
  id: string;
  dateDebut: Date;
  dateFin: Date;
  statut: StatutActiviteType;
  dateRealisee: Date | null;
  commentaire: string | null;
}

interface ActiviteAntenneWithRelations {
  id: string;
  antenneId: string;
  responsableId: string | null;
  statut: StatutActiviteType;
  antenne: { id: string; nom: string; code: string };
  responsable: { id: string; nom: string; prenom: string; email: string } | null;
  periodes: PeriodeData[];
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
  "NON_PLANIFIEE",
  "PLANIFIEE",
  "EN_COURS",
  "REALISEE",
  "EN_RETARD",
  "ANNULEE",
  "SUSPENDUE",
  "REPROGRAMMEE",
];

const STATUTS_MOTIF_OBLIGATOIRE: StatutActiviteType[] = [
  "SUSPENDUE",
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

  // --- Assign antennes dialog state ---
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [availableAntennes, setAvailableAntennes] = useState<AntenneOption[]>([]);
  const [selectedAntenneId, setSelectedAntenneId] = useState("");
  const [selectedResponsableId, setSelectedResponsableId] = useState("");
  const [employesForAntenne, setEmployesForAntenne] = useState<EmployeOption[]>([]);
  const [loadingEmployes, setLoadingEmployes] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  // --- Change responsable state ---
  const [editingResponsableFor, setEditingResponsableFor] = useState<string | null>(null);
  const [newResponsableId, setNewResponsableId] = useState("");
  const [editEmployes, setEditEmployes] = useState<EmployeOption[]>([]);
  const [loadingEditEmployes, setLoadingEditEmployes] = useState(false);

  // --- Add periode state ---
  const [addingPeriodeFor, setAddingPeriodeFor] = useState<string | null>(null);
  const [periodeDebut, setPeriodeDebut] = useState<Date | undefined>(undefined);
  const [periodeFin, setPeriodeFin] = useState<Date | undefined>(undefined);
  const [periodeCommentaire, setPeriodeCommentaire] = useState("");

  const loadAntennes = useCallback(async () => {
    try {
      const result = await getAllAntennes({ pageSize: 200 });
      const existingIds = new Set(activite.activiteAntennes.map((aa) => aa.antenneId));
      setAvailableAntennes(
        result.data
          .map((a) => ({ id: a.id, nom: a.nom, code: a.code }))
          .filter((a) => !existingIds.has(a.id))
      );
    } catch {
      toast.error("Erreur lors du chargement des antennes");
    }
  }, [activite.activiteAntennes]);

  useEffect(() => {
    if (assignDialogOpen) {
      loadAntennes();
      setSelectedAntenneId("");
      setSelectedResponsableId("");
      setEmployesForAntenne([]);
    }
  }, [assignDialogOpen, loadAntennes]);

  async function loadEmployes(antenneId: string) {
    if (!antenneId) return;
    setLoadingEmployes(true);
    try {
      const employes = await getEmployesByAntenne(antenneId);
      setEmployesForAntenne(employes);
    } catch {
      toast.error("Erreur lors du chargement des employes");
    } finally {
      setLoadingEmployes(false);
    }
  }

  async function handleAssignAntenne() {
    if (!selectedAntenneId) {
      toast.error("Veuillez selectionner une antenne");
      return;
    }
    setIsAssigning(true);
    const result = await assignAntennesToActivite({
      activiteId: activite.id,
      assignments: [
        {
          antenneId: selectedAntenneId,
          responsableId: selectedResponsableId || undefined,
        },
      ],
    });
    setIsAssigning(false);
    if (result.success) {
      toast.success("Antenne affectee avec succes");
      setAssignDialogOpen(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function handleRemoveAntenne(aaId: string, antenneName: string) {
    if (!confirm(`Retirer l'antenne "${antenneName}" de cette activite ?`)) return;
    startTransition(async () => {
      const result = await removeAntenneFromActivite(aaId);
      if (result.success) {
        toast.success("Antenne retiree");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  async function startEditResponsable(aa: ActiviteAntenneWithRelations) {
    setEditingResponsableFor(aa.id);
    setNewResponsableId(aa.responsableId ?? "");
    setLoadingEditEmployes(true);
    try {
      const employes = await getEmployesByAntenne(aa.antenneId);
      setEditEmployes(employes);
    } catch {
      toast.error("Erreur lors du chargement des employes");
    } finally {
      setLoadingEditEmployes(false);
    }
  }

  async function handleUpdateResponsable(aaId: string) {
    startTransition(async () => {
      const result = await updateAntenneResponsable(
        aaId,
        newResponsableId || null
      );
      if (result.success) {
        toast.success("Responsable mis a jour");
        setEditingResponsableFor(null);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  async function handleAddPeriode(aaId: string) {
    if (!periodeDebut || !periodeFin) {
      toast.error("Veuillez selectionner les dates de debut et fin");
      return;
    }
    startTransition(async () => {
      const result = await addPeriodeToActiviteAntenne(
        aaId,
        periodeDebut,
        periodeFin,
        periodeCommentaire || undefined
      );
      if (result.success) {
        toast.success("Periode ajoutee");
        setAddingPeriodeFor(null);
        setPeriodeDebut(undefined);
        setPeriodeFin(undefined);
        setPeriodeCommentaire("");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  async function handleRemovePeriode(periodeId: string) {
    if (!confirm("Supprimer cette periode ?")) return;
    startTransition(async () => {
      const result = await removePeriodeFromActiviteAntenne(periodeId);
      if (result.success) {
        toast.success("Periode supprimee");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const motifObligatoire = STATUTS_MOTIF_OBLIGATOIRE.includes(
    newStatut as StatutActiviteType
  );

  function handleStatutChange() {
    if (!newStatut) {
      toast.error("Veuillez selectionner un statut");
      return;
    }

    if (motifObligatoire && !commentaire.trim()) {
      toast.error("Le motif est obligatoire pour ce changement de statut");
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
    <div className="space-y-6 animate-fade-in overflow-x-hidden">
      {/* Header avec navigation */}
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 p-4 sm:p-6 text-white shadow-md sm:shadow-lg sm:shadow-orange-500/25">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10 hidden sm:block" />
        <div className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-white/5 hidden sm:block" />
        <div className="relative flex items-start sm:items-center gap-3 sm:gap-4">
          <Button variant="outline" size="icon" asChild className="shrink-0 rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
            <Link href="/activites">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <CalendarDays className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <h1 className="text-lg sm:text-2xl font-bold tracking-tight truncate">{activite.titre}</h1>
              <ActiviteStatusBadge statut={activite.statut} />
            </div>
            <p className="text-xs sm:text-sm text-white/80 mt-0.5">
              Creee par {activite.createur.prenom} {activite.createur.nom}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="shrink-0 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
          >
            <Link href={`/activites/${activite.id}/modifier`}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Modifier
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ============================================================ */}
        {/* Colonne principale (2/3)                                     */}
        {/* ============================================================ */}
        <div className="space-y-6 lg:col-span-2 order-2 lg:order-1">
          {/* Informations generales */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2.5 text-base">
                <div className="rounded-xl bg-primary/10 p-1.5">
                  <CalendarDays className="h-4 w-4 text-primary" />
                </div>
                Informations generales
              </CardTitle>
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

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
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
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3">
              <CardTitle className="flex items-center gap-2.5 text-base">
                <div className="rounded-xl bg-primary/10 p-1.5">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                Antennes affectees ({activite.activiteAntennes.length})
              </CardTitle>
              <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Affecter
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Affecter une antenne</DialogTitle>
                    <DialogDescription>
                      Selectionnez une antenne et optionnellement un responsable.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Antenne *</label>
                      <Select
                        value={selectedAntenneId}
                        onValueChange={(val) => {
                          setSelectedAntenneId(val);
                          setSelectedResponsableId("");
                          loadEmployes(val);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selectionner une antenne" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableAntennes.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.nom} ({a.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {availableAntennes.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          Toutes les antennes sont deja affectees.
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Responsable</label>
                      <Select
                        value={selectedResponsableId || "__none__"}
                        onValueChange={(val) =>
                          setSelectedResponsableId(val === "__none__" ? "" : val)
                        }
                        disabled={!selectedAntenneId || loadingEmployes}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              loadingEmployes
                                ? "Chargement..."
                                : "A definir ulterieurement"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">
                            A definir ulterieurement
                          </SelectItem>
                          {employesForAntenne.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.prenom} {emp.nom}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setAssignDialogOpen(false)}
                    >
                      Annuler
                    </Button>
                    <Button
                      onClick={handleAssignAntenne}
                      disabled={!selectedAntenneId || isAssigning}
                    >
                      {isAssigning && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Affecter
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {activite.activiteAntennes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune antenne affectee. Cliquez sur &quot;Affecter&quot; pour
                  ajouter une antenne.
                </p>
              ) : (
                <div className="space-y-3">
                  {activite.activiteAntennes.map((aa: ActiviteAntenneWithRelations) => (
                    <div
                      key={aa.id}
                      className="rounded-xl border border-border/60 p-3 transition-colors hover:bg-accent/50"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between sm:justify-start gap-2">
                            <p className="font-medium truncate">
                              {aa.antenne.nom}{" "}
                              <span className="text-xs text-muted-foreground">
                                ({aa.antenne.code})
                              </span>
                            </p>
                            <div className="flex items-center gap-1 sm:hidden">
                              <ActiviteStatusBadge statut={aa.statut} />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() =>
                                  handleRemoveAntenne(aa.id, aa.antenne.nom)
                                }
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          {editingResponsableFor === aa.id ? (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <Select
                                value={newResponsableId || "__none__"}
                                onValueChange={(val) =>
                                  setNewResponsableId(val === "__none__" ? "" : val)
                                }
                                disabled={loadingEditEmployes}
                              >
                                <SelectTrigger className="h-8 w-full sm:w-48">
                                  <SelectValue
                                    placeholder={
                                      loadingEditEmployes
                                        ? "Chargement..."
                                        : "Selectionner"
                                    }
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">
                                    A definir
                                  </SelectItem>
                                  {editEmployes.map((emp) => (
                                    <SelectItem key={emp.id} value={emp.id}>
                                      {emp.prenom} {emp.nom}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="h-8"
                                  onClick={() => handleUpdateResponsable(aa.id)}
                                  disabled={isPending}
                                >
                                  {isPending ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    "OK"
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8"
                                  onClick={() => setEditingResponsableFor(null)}
                                >
                                  Annuler
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 mt-0.5">
                              <p className="text-sm text-muted-foreground truncate">
                                Responsable :{" "}
                                {aa.responsable
                                  ? `${aa.responsable.prenom} ${aa.responsable.nom}`
                                  : "A definir"}
                              </p>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0 text-muted-foreground hover:text-primary"
                                onClick={() => startEditResponsable(aa)}
                                title="Changer le responsable de l'activite"
                              >
                                <UserCheck className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="hidden sm:flex items-center gap-2 shrink-0">
                          <ActiviteStatusBadge statut={aa.statut} />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() =>
                              handleRemoveAntenne(aa.id, aa.antenne.nom)
                            }
                            title="Retirer cette antenne"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Periodes de realisation */}
                      <div className="mt-3 border-t border-border/40 pt-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Periodes de realisation ({aa.periodes?.length ?? 0})
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={() => {
                              setAddingPeriodeFor(addingPeriodeFor === aa.id ? null : aa.id);
                              setPeriodeDebut(undefined);
                              setPeriodeFin(undefined);
                              setPeriodeCommentaire("");
                            }}
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Ajouter
                          </Button>
                        </div>

                        {/* Add periode form */}
                        {addingPeriodeFor === aa.id && (
                          <div className="mb-3 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <p className="text-xs font-medium mb-1">Debut *</p>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="w-full justify-start text-left h-8 text-xs"
                                    >
                                      <CalendarDays className="mr-1.5 h-3 w-3" />
                                      {periodeDebut
                                        ? format(periodeDebut, "dd/MM/yyyy", { locale: fr })
                                        : "Date debut"}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={periodeDebut}
                                      onSelect={setPeriodeDebut}
                                      locale={fr}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                              <div>
                                <p className="text-xs font-medium mb-1">Fin *</p>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="w-full justify-start text-left h-8 text-xs"
                                    >
                                      <CalendarDays className="mr-1.5 h-3 w-3" />
                                      {periodeFin
                                        ? format(periodeFin, "dd/MM/yyyy", { locale: fr })
                                        : "Date fin"}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={periodeFin}
                                      onSelect={setPeriodeFin}
                                      locale={fr}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </div>
                            <input
                              type="text"
                              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                              placeholder="Commentaire (optionnel)"
                              value={periodeCommentaire}
                              onChange={(e) => setPeriodeCommentaire(e.target.value)}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => handleAddPeriode(aa.id)}
                                disabled={isPending || !periodeDebut || !periodeFin}
                              >
                                {isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                                Valider
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs"
                                onClick={() => setAddingPeriodeFor(null)}
                              >
                                Annuler
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Existing periodes */}
                        {aa.periodes && aa.periodes.length > 0 ? (
                          <div className="space-y-1.5">
                            {aa.periodes.map((p: PeriodeData) => (
                              <div
                                key={p.id}
                                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 rounded-lg px-3 py-2 sm:py-1.5 text-sm ${
                                  p.statut === "REALISEE"
                                    ? "bg-green-50 dark:bg-green-950/20"
                                    : p.statut === "EN_RETARD"
                                      ? "bg-red-50 dark:bg-red-950/20"
                                      : "bg-muted/50"
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                  <span className="truncate">
                                    {formatDateFr(p.dateDebut)} — {formatDateFr(p.dateFin)}
                                  </span>
                                  {p.commentaire && (
                                    <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                                      ({p.commentaire})
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center justify-between sm:justify-end gap-1.5 pl-5 sm:pl-0">
                                  {p.commentaire && (
                                    <span className="text-xs text-muted-foreground truncate sm:hidden">
                                      {p.commentaire}
                                    </span>
                                  )}
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <Select
                                      value={p.statut}
                                      onValueChange={(val) => {
                                        startTransition(async () => {
                                          const result = await updatePeriodeStatut(
                                            p.id,
                                            val as StatutActiviteType
                                          );
                                          if (result.success) {
                                            toast.success("Statut de la periode mis a jour");
                                            router.refresh();
                                          } else {
                                            toast.error(result.error);
                                          }
                                        });
                                      }}
                                    >
                                      <SelectTrigger className="h-6 w-auto min-w-[100px] text-[10px] border-none bg-transparent p-0 pl-1">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {(["PLANIFIEE", "EN_COURS", "REALISEE", "EN_RETARD"] as const).map(
                                          (s) => (
                                            <SelectItem key={s} value={s} className="text-xs">
                                              {STATUT_ACTIVITE_LABELS[s]}
                                            </SelectItem>
                                          )
                                        )}
                                      </SelectContent>
                                    </Select>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                      onClick={() => handleRemovePeriode(p.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          !addingPeriodeFor && (
                            <p className="text-xs text-muted-foreground italic">
                              Aucune periode definie
                            </p>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Historique */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2.5 text-base">
                <div className="rounded-xl bg-primary/10 p-1.5">
                  <History className="h-4 w-4 text-primary" />
                </div>
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
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
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
        <div className="space-y-6 order-1 lg:order-2">
          {/* Changement de statut */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {activite.type === "PERIODIQUE" ? "Statut de l'activite" : "Changer le statut"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">
                  Statut actuel
                </p>
                <ActiviteStatusBadge statut={activite.statut} />
              </div>

              {activite.type === "PERIODIQUE" && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 p-3">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Activite periodique : le statut global est calcule
                    automatiquement a partir de l&apos;etat des periodes de
                    chaque antenne. Modifiez le statut de chaque periode
                    individuellement ci-dessous.
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">
                    Seules la suspension et l&apos;annulation peuvent etre
                    appliquees manuellement.
                  </p>
                </div>
              )}

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
                    {(activite.type === "PERIODIQUE"
                      ? STATUT_OPTIONS.filter(
                          (s) =>
                            s !== activite.statut &&
                            ["SUSPENDUE", "ANNULEE", "REPROGRAMMEE"].includes(s)
                        )
                      : STATUT_OPTIONS.filter((s) => s !== activite.statut)
                    ).map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUT_ACTIVITE_LABELS[s] ?? s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Textarea
                  placeholder={
                    motifObligatoire
                      ? "Motif (obligatoire)"
                      : "Commentaire (optionnel)"
                  }
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  rows={3}
                  className={
                    motifObligatoire && !commentaire.trim()
                      ? "border-orange-400 focus-visible:ring-orange-400"
                      : ""
                  }
                />
                {motifObligatoire && (
                  <p className="text-xs text-orange-600">
                    Un motif est obligatoire pour{" "}
                    {newStatut === "SUSPENDUE" ? "suspendre" : "reprogrammer"}{" "}
                    une activite.
                  </p>
                )}

                <Button
                  onClick={handleStatutChange}
                  disabled={
                    isPending ||
                    !newStatut ||
                    (motifObligatoire && !commentaire.trim())
                  }
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
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Recommandations ({activite.recommandations.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {activite.recommandations.map((r: RecommandationData) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between rounded-xl border border-border/60 p-2.5 transition-colors hover:bg-accent/50"
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
