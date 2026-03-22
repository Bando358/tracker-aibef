import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserPen } from "lucide-react";

import { getEmployeById } from "@/lib/actions/employe.actions";
import { EmployeForm } from "@/components/employes/employe-form";
import { Button } from "@/components/ui/button";

export const dynamic = 'force-dynamic';

interface EditEmployePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEmployePage({ params }: EditEmployePageProps) {
  const { id } = await params;
  const employe = await getEmployeById(id);

  if (!employe) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 p-6 text-white shadow-lg shadow-violet-500/25">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-white/5" />
        <div className="absolute right-12 top-3 h-2.5 w-2.5 rounded-full bg-white/20" />
        <div className="absolute right-[7rem] top-8 h-1.5 w-1.5 rounded-full bg-white/15" />
        <div className="absolute left-1/3 -top-8 h-24 w-24 rounded-full bg-white/[0.07]" />
        <div className="relative flex items-center gap-4">
          <Button variant="outline" size="icon" asChild className="shrink-0 rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
            <Link href="/employes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <UserPen className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Modifier l&apos;employe
            </h1>
            <p className="text-sm text-white/80">
              {employe.prenom} {employe.nom}
            </p>
          </div>
        </div>
      </div>

      <EmployeForm initialData={employe} />
    </div>
  );
}
