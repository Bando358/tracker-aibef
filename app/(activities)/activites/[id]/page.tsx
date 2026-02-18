import { notFound } from "next/navigation";

import { getActiviteById } from "@/lib/actions/activite.actions";
import { ActiviteDetail } from "@/components/activites/activite-detail";

export const dynamic = 'force-dynamic';

interface ActivitePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ActivitePageProps) {
  const { id } = await params;
  const activite = await getActiviteById(id);

  return {
    title: activite ? activite.titre : "Activite introuvable",
  };
}

export default async function ActiviteDetailPage({
  params,
}: ActivitePageProps) {
  const { id } = await params;
  const activite = await getActiviteById(id);

  if (!activite) {
    notFound();
  }

  return <ActiviteDetail activite={activite} />;
}
