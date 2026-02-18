import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRecommandationById } from "@/lib/actions/recommandation.actions";
import { RecommandationDetail } from "@/components/recommandations/recommandation-detail";

export const dynamic = 'force-dynamic';

interface RecommandationDetailPageProps {
  params: { id: string };
}

export async function generateMetadata({
  params,
}: RecommandationDetailPageProps): Promise<Metadata> {
  const recommandation = await getRecommandationById(params.id);

  if (!recommandation) {
    return { title: "Recommandation introuvable | TRACKER-AIBEF" };
  }

  return {
    title: `${recommandation.titre} | TRACKER-AIBEF`,
    description: recommandation.description.slice(0, 160),
  };
}

export default async function RecommandationDetailPage({
  params,
}: RecommandationDetailPageProps) {
  const recommandation = await getRecommandationById(params.id);

  if (!recommandation) {
    notFound();
  }

  // Serialize dates for client component
  const serialized = JSON.parse(JSON.stringify(recommandation));

  return <RecommandationDetail recommandation={serialized} />;
}
