import { Metadata } from "next";
import { RecommandationForm } from "@/components/recommandations/recommandation-form";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Nouvelle recommandation | TRACKER-AIBEF",
  description: "Creer une nouvelle recommandation",
};

export default function NouvelleRecommandationPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Nouvelle recommandation
        </h1>
        <p className="text-muted-foreground">
          Creez une nouvelle recommandation et assignez des responsables.
        </p>
      </div>
      <RecommandationForm />
    </div>
  );
}
