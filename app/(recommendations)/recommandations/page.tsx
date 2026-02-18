import { Metadata } from "next";
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
    <RecommandationList
      initialData={JSON.parse(JSON.stringify(result.data))}
      initialTotal={result.total}
    />
  );
}
