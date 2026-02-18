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
import { ArrowLeft, Users } from "lucide-react";
import { ROLE_LABELS } from "@/lib/constants";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Modifier l'Antenne",
};

interface PageProps {
  params: { id: string };
}

export default async function ModifierAntennePage({ params }: PageProps) {
  const antenne = await getAntenneById(params.id);

  if (!antenne) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/antennes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Modifier l&apos;Antenne
          </h1>
          <p className="text-muted-foreground">
            Modifiez les informations de l&apos;antenne{" "}
            <span className="font-medium text-foreground">{antenne.nom}</span>.
          </p>
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
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Statistiques</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Employes</span>
                <Badge variant="secondary">{antenne._count.employes}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Activites</span>
                <Badge variant="secondary">
                  {antenne._count.activiteAntennes}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Recommandations
                </span>
                <Badge variant="secondary">
                  {antenne._count.recommandations}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Employee list */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">
              Employes de l&apos;antenne
            </CardTitle>
          </div>
          <CardDescription>
            {antenne.employes.length === 0
              ? "Aucun employe rattache a cette antenne."
              : `${antenne.employes.length} employe(s) rattache(s) a cette antenne.`}
          </CardDescription>
        </CardHeader>
        {antenne.employes.length > 0 && (
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Prenom</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {antenne.employes.map((employe: { id: string; nom: string; prenom: string; email: string; role: string }) => (
                    <TableRow key={employe.id}>
                      <TableCell className="font-medium">
                        {employe.nom}
                      </TableCell>
                      <TableCell>{employe.prenom}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {employe.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
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
