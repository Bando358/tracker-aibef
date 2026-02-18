import { notFound } from "next/navigation";

import { getEmployeById } from "@/lib/actions/employe.actions";
import { EmployeForm } from "@/components/employes/employe-form";

export const dynamic = 'force-dynamic';

interface EditEmployePageProps {
  params: { id: string };
}

export default async function EditEmployePage({ params }: EditEmployePageProps) {
  const employe = await getEmployeById(params.id);

  if (!employe) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Modifier l&apos;employe
        </h1>
        <p className="text-muted-foreground">
          {employe.prenom} {employe.nom}
        </p>
      </div>

      <EmployeForm initialData={employe} />
    </div>
  );
}
