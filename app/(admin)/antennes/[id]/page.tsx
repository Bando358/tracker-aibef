import Link from "next/link";
import { notFound } from "next/navigation";
import { getAntenneById } from "@/lib/actions/antenne.actions";
import { AntenneForm } from "@/components/antennes/antenne-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Image from "next/image";
import { ArrowLeft, Users, Activity, ClipboardCheck, BarChart3 } from "lucide-react";
import { ROLE_LABELS } from "@/lib/constants";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Modifier l'Antenne",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ModifierAntennePage({ params }: PageProps) {
  const { id } = await params;
  const antenne = await getAntenneById(id);

  if (!antenne) {
    notFound();
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 p-6 text-white shadow-lg shadow-teal-500/25">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-white/5" />
        <div className="absolute right-12 top-3 h-2.5 w-2.5 rounded-full bg-white/20" />
        <div className="absolute right-[7rem] top-8 h-1.5 w-1.5 rounded-full bg-white/15" />
        <div className="absolute left-1/3 -top-8 h-24 w-24 rounded-full bg-white/[0.07]" />
        <div className="relative flex items-center gap-4">
          <Button variant="outline" size="icon" asChild className="shrink-0 rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
            <Link href="/antennes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <Image src="/logo-tracker.png" alt="" width={24} height={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Modifier l&apos;Antenne
            </h1>
            <p className="text-sm text-white/80">
              Modifiez les informations de l&apos;antenne{" "}
              <span className="font-semibold text-white">{antenne.nom}</span>.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Form - takes 2 columns */}
        <div className="lg:col-span-2">
          <AntenneForm
            initialData={{
              id: antenne.id,
              nom: antenne.nom,
              code: antenne.code,
              region: antenne.region,
              ville: antenne.ville,
              adresse: antenne.adresse,
              telephone: antenne.telephone,
              email: antenne.email,
            }}
          />
        </div>

        {/* Stats sidebar */}
        <div className="space-y-4">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2.5 text-base">
                <div className="rounded-xl bg-primary/10 p-1.5">
                  <BarChart3 className="h-4 w-4 text-primary" />
                </div>
                Statistiques
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  Employes
                </span>
                <Badge variant="secondary" className="tabular-nums">{antenne._count.employes}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Activity className="h-3.5 w-3.5" />
                  Activites
                </span>
                <Badge variant="secondary" className="tabular-nums">
                  {antenne._count.activiteAntennes}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  Recommandations
                </span>
                <Badge variant="secondary" className="tabular-nums">
                  {antenne._count.recommandations}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Employee list */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-primary/10 p-2">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">
                Employes de l&apos;antenne
              </CardTitle>
              <CardDescription>
                {antenne.employes.length === 0
                  ? "Aucun employe rattache a cette antenne."
                  : `${antenne.employes.length} employe(s) rattache(s) a cette antenne.`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        {antenne.employes.length > 0 && (
          <CardContent>
            <div className="rounded-xl border border-border/60 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="font-semibold">Nom</TableHead>
                    <TableHead className="font-semibold">Prenom</TableHead>
                    <TableHead className="font-semibold">Email</TableHead>
                    <TableHead className="font-semibold">Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {antenne.employes.map((employe: { id: string; nom: string; prenom: string; email: string; role: string }) => (
                    <TableRow key={employe.id} className="transition-colors">
                      <TableCell className="font-medium">
                        {employe.nom}
                      </TableCell>
                      <TableCell>{employe.prenom}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {employe.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-medium">
                          {ROLE_LABELS[employe.role] ?? employe.role}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
