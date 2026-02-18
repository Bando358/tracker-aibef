import { redirect, notFound } from "next/navigation";
import { getSessionUser } from "@/lib/actions/auth.actions";
import { PointageList } from "@/components/pointages/pointage-list";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = 'force-dynamic';

interface EmployePointagePageProps {
  params: { employeId: string };
}

export default async function EmployePointagePage({
  params,
}: EmployePointagePageProps) {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  // Seuls les managers peuvent voir les pointages d'un autre employe
  if (
    session.role !== "SUPER_ADMIN" &&
    session.role !== "RESPONSABLE_ANTENNE"
  ) {
    redirect("/pointages");
  }

  const employe = await prisma.user.findUnique({
    where: { id: params.employeId },
    select: {
      id: true,
      nom: true,
      prenom: true,
      email: true,
      role: true,
      antenneId: true,
      antenne: { select: { nom: true } },
    },
  });

  if (!employe) {
    notFound();
  }

  // Un responsable ne peut voir que les employes de son antenne
  if (
    session.role === "RESPONSABLE_ANTENNE" &&
    employe.antenneId !== session.antenneId
  ) {
    redirect("/pointages");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/pointages">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            Pointages de {employe.prenom} {employe.nom}
          </h1>
          <p className="text-muted-foreground">
            {employe.email}
            {employe.antenne ? ` - ${employe.antenne.nom}` : ""}
          </p>
        </div>
      </div>

      <PointageList userId={employe.id} />
    </div>
  );
}
