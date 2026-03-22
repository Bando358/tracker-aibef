import Link from "next/link";
import { FolderKanban, Plus } from "lucide-react";
import { getAllProjets, getProjetFilterOptions } from "@/lib/actions/projet.actions";
import { getAllAntennes } from "@/lib/actions/antenne.actions";
import { ProjetList } from "@/components/projets/projet-list";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Gestion des Projets",
};

export default async function ProjetsPage() {
  const [initialData, filterOptions, antennesResult] = await Promise.all([
    getAllProjets({ page: 1 }),
    getProjetFilterOptions(),
    getAllAntennes({ pageSize: 100 }),
  ]);
  const antennes = antennesResult.data.map((a) => ({ id: a.id, nom: a.nom }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 p-6 text-white shadow-lg shadow-violet-500/25">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-white/5" />
        <div className="absolute right-12 top-3 h-2.5 w-2.5 rounded-full bg-white/20" />
        <div className="absolute right-[7rem] top-8 h-1.5 w-1.5 rounded-full bg-white/15" />
        <div className="absolute left-1/3 -top-8 h-24 w-24 rounded-full bg-white/[0.07]" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
              <FolderKanban className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Gestion des Projets
              </h1>
              <p className="text-sm text-white/80">
                Gerez les projets du Business Plan AIBEF
              </p>
            </div>
          </div>
          <Button
            asChild
            className="gap-2 bg-white text-violet-600 shadow-lg hover:bg-white/90"
          >
            <Link href="/projets/nouveau">
              <Plus className="h-4 w-4" />
              Nouveau projet
            </Link>
          </Button>
        </div>
      </div>
      <ProjetList
        initialData={initialData}
        bailleurs={filterOptions.bailleurs}
        typesFonds={filterOptions.typesFonds}
        antennes={antennes}
      />
    </div>
  );
}
