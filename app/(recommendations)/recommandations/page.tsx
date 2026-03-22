import { Metadata } from "next";
import { ClipboardCheck } from "lucide-react";
import { getAllRecommandations } from "@/lib/actions/recommandation.actions";
import { RecommandationList } from "@/components/recommandations/recommandation-list";
import { PAGINATION_DEFAULT } from "@/lib/constants";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Recommandations | TRACKER-AIBEF",
  description: "Liste et suivi des recommandations",
};

export default async function RecommandationsPage() {
  const result = await getAllRecommandations({
    page: 1,
    pageSize: PAGINATION_DEFAULT,
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 p-6 text-white shadow-lg shadow-indigo-500/25">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-white/5" />
        <div className="absolute right-12 top-3 h-2.5 w-2.5 rounded-full bg-white/20" />
        <div className="absolute right-[7rem] top-8 h-1.5 w-1.5 rounded-full bg-white/15" />
        <div className="absolute left-1/3 -top-8 h-24 w-24 rounded-full bg-white/[0.07]" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <ClipboardCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Recommandations</h1>
            <p className="text-sm text-white/80">
              Suivez et gerez les recommandations
            </p>
          </div>
        </div>
      </div>

      <RecommandationList
        initialData={JSON.parse(JSON.stringify(result.data))}
        initialTotal={result.total}
      />
    </div>
  );
}
