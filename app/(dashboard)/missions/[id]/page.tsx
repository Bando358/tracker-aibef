import { notFound } from "next/navigation";
import { getMissionById } from "@/lib/actions/mission.actions";
import { MissionDetail } from "@/components/missions/mission-detail";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const mission = await getMissionById(id);
  return { title: mission ? mission.objet : "Mission introuvable" };
}

export default async function MissionDetailPage({ params }: Props) {
  const { id } = await params;
  const mission = await getMissionById(id);
  if (!mission) notFound();

  return <MissionDetail mission={JSON.parse(JSON.stringify(mission))} />;
}
