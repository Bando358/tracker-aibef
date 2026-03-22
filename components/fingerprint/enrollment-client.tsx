"use client";

import { useState, useCallback } from "react";
import { FingerprintProvider } from "./fingerprint-context";
import { FingerprintStatus } from "./fingerprint-status";
import { FingerprintCapture } from "./fingerprint-capture";
import {
  getEmpreintesUtilisateur,
  supprimerEmpreinte,
} from "@/lib/actions/empreinte.actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Fingerprint,
  UserCheck,
  UserX,
  Trash2,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  DOIGT_LABELS,
  ENROLLMENT_CAPTURES,
  MIN_QUALITY,
} from "@/lib/fingerprint/types";
import type { FingerprintCaptureResult } from "@/lib/fingerprint/types";

interface Employe {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  empreinteEnrolee: boolean;
  antenne: { nom: string } | null;
  _count: { empreintes: number };
}

interface EmpreinteInfo {
  id: string;
  doigt: number;
  qualite: number;
  actif: boolean;
  createdAt: string;
  enrolledBy: { nom: string; prenom: string };
}

interface EnrollmentClientProps {
  employes: Employe[];
}

export function EnrollmentClient({ employes }: EnrollmentClientProps) {
  return (
    <FingerprintProvider>
      <EnrollmentContent employes={employes} />
    </FingerprintProvider>
  );
}

function EnrollmentContent({ employes }: EnrollmentClientProps) {
  const [selectedEmploye, setSelectedEmploye] = useState<Employe | null>(null);
  const [empreintes, setEmpreintes] = useState<EmpreinteInfo[]>([]);
  const [loadingEmpreintes, setLoadingEmpreintes] = useState(false);
  const [selectedDoigt, setSelectedDoigt] = useState<number>(2); // Index droit par defaut
  const [captures, setCaptures] = useState<FingerprintCaptureResult[]>([]);
  const [isEnrolling, setIsEnrolling] = useState(false);

  const loadEmpreintes = useCallback(async (userId: string) => {
    setLoadingEmpreintes(true);
    try {
      const data = await getEmpreintesUtilisateur(userId);
      setEmpreintes(JSON.parse(JSON.stringify(data)));
    } catch {
      toast.error("Erreur lors du chargement des empreintes");
    } finally {
      setLoadingEmpreintes(false);
    }
  }, []);

  function handleSelectEmploye(emp: Employe) {
    setSelectedEmploye(emp);
    setCaptures([]);
    loadEmpreintes(emp.id);
  }

  function handleCapture(result: FingerprintCaptureResult) {
    if (!result.success) {
      toast.error(result.errorMessage ?? "Echec de la capture");
      return;
    }

    if (result.quality !== undefined && result.quality < MIN_QUALITY) {
      toast.warning(
        `Qualite insuffisante (${result.quality}%). Minimum requis: ${MIN_QUALITY}%. Reessayez.`
      );
      return;
    }

    const newCaptures = [...captures, result];
    setCaptures(newCaptures);

    if (newCaptures.length < ENROLLMENT_CAPTURES) {
      toast.success(
        `Capture ${newCaptures.length}/${ENROLLMENT_CAPTURES} reussie`
      );
    }
  }

  async function handleEnroll() {
    if (!selectedEmploye || captures.length < ENROLLMENT_CAPTURES) return;

    setIsEnrolling(true);
    try {
      // Prendre la meilleure capture (qualite la plus haute)
      const best = captures.reduce((a, b) =>
        (a.quality ?? 0) >= (b.quality ?? 0) ? a : b
      );

      const response = await fetch("/api/fingerprint/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedEmploye.id,
          doigt: selectedDoigt,
          templateBase64: best.templateBase64,
          qualite: best.quality ?? 0,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error ?? "Erreur lors de l'enrolement");
        return;
      }

      toast.success(
        `Empreinte enrolee pour ${selectedEmploye.prenom} ${selectedEmploye.nom}`
      );
      setCaptures([]);
      loadEmpreintes(selectedEmploye.id);
    } catch {
      toast.error("Erreur lors de l'enrolement");
    } finally {
      setIsEnrolling(false);
    }
  }

  async function handleDelete(empreinteId: string) {
    const result = await supprimerEmpreinte(empreinteId);
    if (result.success) {
      toast.success("Empreinte supprimee");
      if (selectedEmploye) loadEmpreintes(selectedEmploye.id);
    } else {
      toast.error(result.error ?? "Erreur lors de la suppression");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
      {/* Colonne gauche : liste des employes */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Employes</CardTitle>
            <FingerprintStatus />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[600px] overflow-y-auto">
            {employes.map((emp) => (
              <button
                key={emp.id}
                onClick={() => handleSelectEmploye(emp)}
                className={`w-full text-left px-4 py-3 border-b transition-colors hover:bg-muted/50 ${
                  selectedEmploye?.id === emp.id ? "bg-muted" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">
                      {emp.prenom} {emp.nom}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {emp.antenne?.nom ?? "Sans antenne"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {emp.empreinteEnrolee ? (
                      <Badge
                        variant="outline"
                        className="gap-1 border-green-500 text-green-700 text-xs"
                      >
                        <UserCheck className="h-3 w-3" />
                        {emp._count.empreintes}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <UserX className="h-3 w-3" />
                        Non enrole
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Colonne droite : enrolement */}
      <div className="space-y-6">
        {!selectedEmploye ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <Fingerprint className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Selectionnez un employe pour gerer ses empreintes</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Info employe selectionne */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {selectedEmploye.prenom} {selectedEmploye.nom}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {selectedEmploye.email} -{" "}
                  {selectedEmploye.antenne?.nom ?? "Sans antenne"}
                </p>

                {/* Empreintes existantes */}
                {loadingEmpreintes ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Chargement...
                  </div>
                ) : empreintes.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      Empreintes enrolees ({empreintes.length})
                    </p>
                    {empreintes.map((emp) => (
                      <div
                        key={emp.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {DOIGT_LABELS[emp.doigt] ?? `Doigt ${emp.doigt}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Qualite: {emp.qualite}% - Par{" "}
                            {emp.enrolledBy.prenom} {emp.enrolledBy.nom}
                          </p>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Supprimer l&apos;empreinte ?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Cette action supprimera l&apos;empreinte{" "}
                                {DOIGT_LABELS[emp.doigt]}. L&apos;employe ne
                                pourra plus utiliser ce doigt pour le
                                pointage.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(emp.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Aucune empreinte enrolee
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Processus d'enrolement */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Enroler une nouvelle empreinte
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Selection du doigt */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Doigt</label>
                  <Select
                    value={String(selectedDoigt)}
                    onValueChange={(v) => {
                      setSelectedDoigt(Number(v));
                      setCaptures([]);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(DOIGT_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Progression des captures */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Captures : {captures.length}/{ENROLLMENT_CAPTURES}
                  </p>
                  <div className="flex gap-2">
                    {Array.from({ length: ENROLLMENT_CAPTURES }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-2 flex-1 rounded-full ${
                          i < captures.length
                            ? "bg-green-500"
                            : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Bouton de capture */}
                {captures.length < ENROLLMENT_CAPTURES && (
                  <FingerprintCapture
                    onCapture={handleCapture}
                    label={`Capture ${captures.length + 1}/${ENROLLMENT_CAPTURES}`}
                    showImage={true}
                  />
                )}

                {/* Bouton d'enregistrement */}
                {captures.length >= ENROLLMENT_CAPTURES && (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-green-200 bg-green-50 p-3 flex items-center gap-2 text-green-700">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {ENROLLMENT_CAPTURES} captures reussies
                      </span>
                    </div>
                    <Button
                      onClick={handleEnroll}
                      disabled={isEnrolling}
                      className="w-full h-12"
                    >
                      {isEnrolling ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Enregistrement...
                        </>
                      ) : (
                        <>
                          <Fingerprint className="mr-2 h-5 w-5" />
                          Enregistrer l&apos;empreinte
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
