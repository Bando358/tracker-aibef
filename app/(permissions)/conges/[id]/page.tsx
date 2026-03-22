import { redirect, notFound } from "next/navigation";
import { getSessionUser } from "@/lib/actions/auth.actions";
import { getCongeById } from "@/lib/actions/conge.actions";
import { canApprove } from "@/services/conge.service";
import { ApprovalWorkflow } from "@/components/conges/approval-workflow";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CalendarDays, User, Calendar, FileText } from "lucide-react";
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
  params: Promise<{ id: string }>;
}

export default async function CongeDetailPage({
  params,
}: CongeDetailPageProps) {
  const { id } = await params;
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const conge = await getCongeById(id);
  if (!conge) notFound();

  const isManager =
    session.role === "SUPER_ADMIN" ||
    session.role === "ADMIN_SIMPLE" ||
    session.role === "RESPONSABLE_ANTENNE" ||
    session.role === "ADMIN_ANTENNE";

  const canApproveOrReject =
    isManager &&
    conge.employeId !== session.id &&
    canApprove(session.role as Role, conge.statut as StatutConge);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 p-6 text-white shadow-lg shadow-emerald-500/25">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-white/5" />
        <div className="absolute right-12 top-3 h-2.5 w-2.5 rounded-full bg-white/20" />
        <div className="absolute right-[7rem] top-8 h-1.5 w-1.5 rounded-full bg-white/15" />
        <div className="absolute left-1/3 -top-8 h-24 w-24 rounded-full bg-white/[0.07]" />
        <div className="relative flex items-center gap-4">
          <Button variant="outline" size="icon" asChild className="shrink-0 rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
            <Link href="/conges">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <CalendarDays className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                Detail de la demande de conge
              </h1>
              <StatusBadge
                status={conge.statut}
                label={STATUT_CONGE_LABELS[conge.statut]}
              />
            </div>
            <p className="text-sm text-white/80">
              {TYPE_CONGE_LABELS[conge.type] ?? conge.type} -{" "}
              {conge.nbJours} jour{conge.nbJours > 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Informations de la demande */}
        <div className="space-y-6">
          {/* Informations de l'employe */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2.5 text-base">
                <div className="rounded-xl bg-primary/10 p-1.5">
                  <User className="h-4 w-4 text-primary" />
                </div>
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
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2.5 text-base">
                <div className="rounded-xl bg-primary/10 p-1.5">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
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
                  <p className="text-lg font-bold text-primary tabular-nums">{conge.nbJours} jour{conge.nbJours > 1 ? "s" : ""} ouvre{conge.nbJours > 1 ? "s" : ""}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">
                    Date de debut
                  </span>
                  <p className="font-medium tabular-nums">
                    {formatDateFr(conge.dateDebut)}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">
                    Date de fin
                  </span>
                  <p className="font-medium tabular-nums">
                    {formatDateFr(conge.dateFin)}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">
                    Date de creation
                  </span>
                  <p className="font-medium tabular-nums">
                    {formatDateFr(conge.createdAt)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Motif */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2.5 text-base">
                <div className="rounded-xl bg-primary/10 p-1.5">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                Motif
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{conge.motif}</p>
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
