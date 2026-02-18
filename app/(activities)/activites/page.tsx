import Link from "next/link";
import { Plus } from "lucide-react";

import { getAllActivites } from "@/lib/actions/activite.actions";
import { ActiviteList } from "@/components/activites/activite-list";
import { Button } from "@/components/ui/button";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Activites",
};

export default async function ActivitesPage() {
  const initialData = await getAllActivites({
    page: 1,
    pageSize: 20,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Activites</h1>
          <p className="text-muted-foreground">
            Gerez et suivez l&apos;ensemble des activites programmees.
          </p>
        </div>
        <Button asChild>
          <Link href="/activites/nouvelle">
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle activite
          </Link>
        </Button>
      </div>

      <ActiviteList initialData={initialData} />
    </div>
  );
}
