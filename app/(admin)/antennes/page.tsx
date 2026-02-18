import Link from "next/link";
import { getAllAntennes } from "@/lib/actions/antenne.actions";
import { AntenneList } from "@/components/antennes/antenne-list";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Gestion des Antennes",
};

export default async function AntennesPage() {
  const initialData = await getAllAntennes({ page: 1 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Gestion des Antennes
          </h1>
          <p className="text-muted-foreground">
            Gerez les antennes de l&apos;organisation.
          </p>
        </div>
        <Button asChild>
          <Link href="/antennes/nouveau">
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle antenne
          </Link>
        </Button>
      </div>
      <AntenneList initialData={initialData} />
    </div>
  );
}
