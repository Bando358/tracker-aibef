import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";

import { getSessionUser } from "@/lib/actions/auth.actions";
import { PointageList } from "@/components/pointages/pointage-list";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";

export const dynamic = 'force-dynamic';

interface EmployePointagePageProps {
  params: Promise<{ employeId: string }>;
}

export default async function EmployePointagePage({
  params,
}: EmployePointagePageProps) {
  const { employeId } = await params;
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
    where: { id: employeId },
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
    <div className="space-y-6 animate-fade-in">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 p-6 text-white shadow-lg shadow-sky-500/25">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-white/5" />
        <div className="absolute right-12 top-3 h-2.5 w-2.5 rounded-full bg-white/20" />
        <div className="absolute right-[7rem] top-8 h-1.5 w-1.5 rounded-full bg-white/15" />
        <div className="absolute left-1/3 -top-8 h-24 w-24 rounded-full bg-white/[0.07]" />
        <div className="relative flex items-center gap-4">
          <Button variant="outline" size="icon" asChild className="shrink-0 rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
            <Link href="/pointages">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <Clock className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Pointages de {employe.prenom} {employe.nom}
            </h1>
            <p className="text-sm text-white/80">
              {employe.email}
              {employe.antenne ? ` - ${employe.antenne.nom}` : ""}
            </p>
          </div>
        </div>
      </div>

      <PointageList userId={employe.id} />
    </div>
  );
}
