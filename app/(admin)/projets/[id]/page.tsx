import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FolderKanban, Activity } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import { getProjetById } from "@/lib/actions/projet.actions";
import { ProjetForm } from "@/components/projets/projet-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { STATUT_ACTIVITE_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

interface ProjetDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjetDetailPage({ params }: ProjetDetailPageProps) {
  const { id } = await params;
  const projet = await getProjetById(id);

  if (!projet) notFound();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 p-6 text-white shadow-lg shadow-violet-500/25">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-white/5" />
        <div className="absolute right-12 top-3 h-2.5 w-2.5 rounded-full bg-white/20" />
        <div className="absolute right-[7rem] top-8 h-1.5 w-1.5 rounded-full bg-white/15" />
        <div className="absolute left-1/3 -top-8 h-24 w-24 rounded-full bg-white/[0.07]" />
        <div className="relative flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            asChild
            className="shrink-0 rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
          >
            <Link href="/projets">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <FolderKanban className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{projet.nom}</h1>
              <Badge className="bg-white/20 text-white hover:bg-white/30 font-mono">
                {projet.code}
              </Badge>
            </div>
            <p className="text-sm text-white/80">
              {projet.dateDebut
                ? format(new Date(projet.dateDebut), "dd MMM yyyy", { locale: fr })
                : ""}
              {projet.dateFin
                ? ` → ${format(new Date(projet.dateFin), "dd MMM yyyy", { locale: fr })}`
                : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Formulaire de modification */}
        <div>
          <ProjetForm
            initialData={{
              id: projet.id,
              code: projet.code,
              nom: projet.nom,
              description: projet.description,
              dateDebut: projet.dateDebut,
              dateFin: projet.dateFin,
            }}
          />
        </div>

        {/* Liste des activites liees */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activites ({projet._count.activites})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {projet.activites.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune activite liee a ce projet.
              </p>
            ) : (
              <div className="space-y-3">
                {projet.activites.map((activite, index) => (
                  <div key={activite.id}>
                    {index > 0 && <Separator className="my-3" />}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/activites/${activite.id}`}
                          className="text-sm font-medium text-primary hover:underline truncate block"
                        >
                          {activite.titre}
                        </Link>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {activite.type === "PERIODIQUE" ? "Periodique" : "Ponctuelle"}
                          {activite.dateDebut &&
                            ` · ${format(new Date(activite.dateDebut), "dd/MM/yyyy", { locale: fr })}`}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="shrink-0 text-xs"
                      >
                        {STATUT_ACTIVITE_LABELS[activite.statut] ?? activite.statut}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
