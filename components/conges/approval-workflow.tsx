"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { approveConge, rejectConge } from "@/lib/actions/conge.actions";
import { STATUT_CONGE_LABELS } from "@/lib/constants";
import {
  CheckCircle,
  XCircle,
  Loader2,
  ArrowRight,
  Circle,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface CongeWithRelations {
  id: string;
  type: string;
  statut: string;
  dateDebut: Date | string;
  dateFin: Date | string;
  nbJours: number;
  motif: string;
  commentaireApprobateur?: string | null;
  employe: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    role: string;
    antenne?: { nom: string } | null;
  };
  approbateur?: {
    nom: string;
    prenom: string;
    role: string;
  } | null;
}

interface ApprovalWorkflowProps {
  conge: CongeWithRelations;
  canApproveOrReject: boolean;
  onAction?: () => void;
}

// Etapes du workflow
const WORKFLOW_STEPS = [
  { key: "BROUILLON", label: "Brouillon" },
  { key: "SOUMIS", label: "Soumis" },
  { key: "APPROUVE_RESPONSABLE", label: "Approuve (Responsable)" },
  { key: "APPROUVE_FINAL", label: "Approuve (Final)" },
] as const;

function getStepState(
  stepKey: string,
  currentStatut: string
): "completed" | "current" | "pending" | "rejected" {
  if (currentStatut === "REFUSE" || currentStatut === "ANNULE") {
    // Trouver l'index de l'etape actuelle
    const stepIndex = WORKFLOW_STEPS.findIndex((s) => s.key === stepKey);
    const currentIndex = WORKFLOW_STEPS.findIndex(
      (s) => (s.key as string) === currentStatut
    );

    // Si le statut est REFUSE/ANNULE, on montre les etapes precedentes comme completees
    // et on cherche la derniere etape valide avant le refus
    if (stepKey === currentStatut) return "rejected";
    if (stepIndex < currentIndex) return "completed";

    // Pour les statuts REFUSE/ANNULE, on marque l'etape SOUMIS comme dernier point
    if (currentStatut === "REFUSE" || currentStatut === "ANNULE") {
      if (stepKey === "BROUILLON") return "completed";
      if (stepKey === "SOUMIS") return "current";
      return "pending";
    }
    return "pending";
  }

  const stepIndex = WORKFLOW_STEPS.findIndex((s) => s.key === stepKey);
  const currentIndex = WORKFLOW_STEPS.findIndex(
    (s) => s.key === currentStatut
  );

  if (stepIndex < currentIndex) return "completed";
  if (stepIndex === currentIndex) return "current";
  return "pending";
}

export function ApprovalWorkflow({
  conge,
  canApproveOrReject,
  onAction,
}: ApprovalWorkflowProps) {
  const [commentaire, setCommentaire] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleApprove() {
    startTransition(async () => {
      const result = await approveConge(conge.id, commentaire || undefined);
      if (result.success) {
        toast.success("Demande approuvee");
        setCommentaire("");
        onAction?.();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleReject() {
    if (!commentaire.trim()) {
      toast.error("Le commentaire est obligatoire pour un refus");
      return;
    }
    startTransition(async () => {
      const result = await rejectConge(conge.id, commentaire);
      if (result.success) {
        toast.success("Demande refusee");
        setCommentaire("");
        onAction?.();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const isRefused = conge.statut === "REFUSE";
  const isCancelled = conge.statut === "ANNULE";
  const isFinal = conge.statut === "APPROUVE_FINAL";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progression de la demande</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stepper visuel */}
        <div className="flex items-center justify-between px-2">
          {WORKFLOW_STEPS.map((step, index) => {
            const state = getStepState(step.key, conge.statut);
            return (
              <div key={step.key} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                      state === "completed" &&
                        "border-green-500 bg-green-100 text-green-700",
                      state === "current" &&
                        "border-blue-500 bg-blue-100 text-blue-700",
                      state === "pending" &&
                        "border-gray-300 bg-gray-50 text-gray-400",
                      state === "rejected" &&
                        "border-red-500 bg-red-100 text-red-700"
                    )}
                  >
                    {state === "completed" ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : state === "rejected" ? (
                      <XCircle className="h-5 w-5" />
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "mt-2 text-xs text-center max-w-[80px]",
                      state === "current" && "font-semibold text-blue-700",
                      state === "completed" && "text-green-700",
                      state === "rejected" && "text-red-700",
                      state === "pending" && "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {index < WORKFLOW_STEPS.length - 1 && (
                  <ArrowRight className="mx-2 h-4 w-4 text-muted-foreground mt-[-20px]" />
                )}
              </div>
            );
          })}
        </div>

        {/* Statut actuel + approbateur */}
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Statut actuel</span>
            <StatusBadge
              status={conge.statut}
              label={STATUT_CONGE_LABELS[conge.statut]}
            />
          </div>
          {conge.approbateur && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Dernier approbateur
              </span>
              <span className="text-sm font-medium">
                {conge.approbateur.prenom} {conge.approbateur.nom}
              </span>
            </div>
          )}
          {conge.commentaireApprobateur && (
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">
                Commentaire
              </span>
              <p className="text-sm bg-muted p-2 rounded">
                {conge.commentaireApprobateur}
              </p>
            </div>
          )}
        </div>

        {/* Formulaire d'approbation/refus */}
        {canApproveOrReject && !isRefused && !isCancelled && !isFinal && (
          <div className="space-y-4 border-t pt-4">
            <h4 className="text-sm font-semibold">Decision</h4>
            <Textarea
              placeholder="Commentaire (obligatoire pour un refus)..."
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              rows={3}
            />
            <div className="flex gap-3">
              <Button
                onClick={handleApprove}
                disabled={isPending}
                className="flex-1"
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                Approuver
              </Button>
              <ConfirmDialog
                trigger={
                  <Button
                    variant="destructive"
                    disabled={isPending}
                    className="flex-1"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Refuser
                  </Button>
                }
                title="Refuser la demande"
                description="Etes-vous sur de vouloir refuser cette demande de conge ? Le commentaire est obligatoire."
                confirmLabel="Confirmer le refus"
                onConfirm={handleReject}
                variant="destructive"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
