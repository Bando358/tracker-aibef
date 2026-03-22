import Link from "next/link";
import { Plus, Activity } from "lucide-react";

import { getAllActivites } from "@/lib/actions/activite.actions";
import { fetchRapportFilterOptions } from "@/lib/actions/rapport.actions";
import { ActiviteList } from "@/components/activites/activite-list";
import { Button } from "@/components/ui/button";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Activites",
};

export default async function ActivitesPage() {
  const [initialData, filterOptions] = await Promise.all([
    getAllActivites({ page: 1, pageSize: 20 }),
    fetchRapportFilterOptions(),
  ]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 p-6 text-white shadow-lg shadow-orange-500/25">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-white/5" />
        <div className="absolute right-12 top-3 h-2.5 w-2.5 rounded-full bg-white/20" />
        <div className="absolute right-[7rem] top-8 h-1.5 w-1.5 rounded-full bg-white/15" />
        <div className="absolute left-1/3 -top-8 h-24 w-24 rounded-full bg-white/[0.07]" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Activites</h1>
              <p className="text-sm text-white/80">
                Gerez et suivez l&apos;ensemble des activites programmees
              </p>
            </div>
          </div>
          <Button asChild className="gap-2 bg-white text-orange-600 shadow-lg hover:bg-white/90">
            <Link href="/activites/nouvelle">
              <Plus className="h-4 w-4" />
              Nouvelle activite
            </Link>
          </Button>
        </div>
      </div>

      <ActiviteList
        initialData={initialData}
        antennes={filterOptions.antennes}
        projets={filterOptions.projets}
      />
    </div>
  );
}
