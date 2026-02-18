import { redirect, notFound } from "next/navigation";
import { getSessionUser } from "@/lib/actions/auth.actions";
import { getCongeById } from "@/lib/actions/conge.actions";
import { canApprove } from "@/services/conge.service";
import { ApprovalWorkflow } from "@/components/conges/approval-workflow";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Calendar, FileText } from "lucide-react";
import {
  STATUT_CONGE_LABELS,
  TYPE_CONGE_LABELS,
  ROLE_LABELS,
} from "@/lib/constants";
import { formatDateFr } from "@/lib/date-utils";
import Link from "next/link";
import type { Role, StatutConge } from "@/app/generated/prisma/client";

export const dynamic = 'force-dynamic';

interface CongeDetailPageProps {
  params: { id: string };
}

export default async function CongeDetailPage({
  params,
}: CongeDetailPageProps) {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const conge = await getCongeById(params.id);
  if (!conge) notFound();

  const isManager =
    session.role === "SUPER_ADMIN" ||
    session.role === "RESPONSABLE_ANTENNE";

  const canApproveOrReject =
    isManager &&
    conge.employeId !== session.id &&
    canApprove(session.role as Role, conge.statut as StatutConge);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/conges">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">
              Detail de la demande de conge
            </h1>
            <StatusBadge
              status={conge.statut}
              label={STATUT_CONGE_LABELS[conge.statut]}
            />
          </div>
          <p className="text-muted-foreground">
            {TYPE_CONGE_LABELS[conge.type] ?? conge.type} -{" "}
            {conge.nbJours} jour{conge.nbJours > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Informations de la demande */}
        <div className="space-y-6">
          {/* Informations de l'employe */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                Informations de l&apos;employe
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <span className="text-sm text-muted-foreground">Nom</span>
                  <p className="font-medium">
                    {conge.employe.prenom} {conge.employe.nom}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Email</span>
                  <p className="font-medium">{conge.employe.email}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Role</span>
                  <p className="font-medium">
                    {ROLE_LABELS[conge.employe.role] ?? conge.employe.role}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">
                    Antenne
                  </span>
                  <p className="font-medium">
                    {conge.employe.antenne?.nom ?? "Non assigne"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Details du conge */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4" />
                Details du conge
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <span className="text-sm text-muted-foreground">Type</span>
                  <p className="font-medium">
                    {TYPE_CONGE_LABELS[conge.type] ?? conge.type}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">
                    Nombre de jours
                  </span>
                  <p className="font-medium text-lg">{conge.nbJours} jour{conge.nbJours > 1 ? "s" : ""} ouvre{conge.nbJours > 1 ? "s" : ""}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">
                    Date de debut
                  </span>
                  <p className="font-medium">
                    {formatDateFr(conge.dateDebut)}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">
                    Date de fin
                  </span>
                  <p className="font-medium">
                    {formatDateFr(conge.dateFin)}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">
                    Date de creation
                  </span>
                  <p className="font-medium">
                    {formatDateFr(conge.createdAt)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Motif */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                Motif
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{conge.motif}</p>
            </CardContent>
          </Card>
        </div>

        {/* Workflow d'approbation */}
        <div>
          <ApprovalWorkflow
            conge={{
              id: conge.id,
              type: conge.type,
              statut: conge.statut,
              dateDebut: conge.dateDebut,
              dateFin: conge.dateFin,
              nbJours: conge.nbJours,
              motif: conge.motif,
              commentaireApprobateur: conge.commentaireApprobateur,
              employe: {
                id: conge.employe.id,
                nom: conge.employe.nom,
                prenom: conge.employe.prenom,
                email: conge.employe.email,
                role: conge.employe.role,
                antenne: conge.employe.antenne,
              },
              approbateur: conge.approbateur
                ? {
                    nom: conge.approbateur.nom,
                    prenom: conge.approbateur.prenom,
                    role: conge.approbateur.role,
                  }
                : null,
            }}
            canApproveOrReject={canApproveOrReject}
          />
        </div>
      </div>
    </div>
  );
}
