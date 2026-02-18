import Link from "next/link";
import { Plus } from "lucide-react";

import { getAllEmployes } from "@/lib/actions/employe.actions";
import { EmployeList } from "@/components/employes/employe-list";
import { Button } from "@/components/ui/button";

export const dynamic = 'force-dynamic';

export default async function EmployesPage() {
  const initialData = await getAllEmployes({ page: 1 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Gestion des Employes
          </h1>
          <p className="text-muted-foreground">
            Gerez les comptes et les roles des employes
          </p>
        </div>
        <Button asChild>
          <Link href="/employes/nouveau">
            <Plus className="mr-2 h-4 w-4" />
            Nouvel Employe
          </Link>
        </Button>
      </div>

      <EmployeList initialData={initialData} />
    </div>
  );
}
