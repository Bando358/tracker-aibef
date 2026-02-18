import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ActiviteForm } from "@/components/activites/activite-form";
import { Button } from "@/components/ui/button";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Nouvelle activite",
};

export default function NouvelleActivitePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/activites">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Nouvelle activite
          </h1>
          <p className="text-muted-foreground">
            Remplissez le formulaire pour creer une nouvelle activite.
          </p>
        </div>
      </div>

      <ActiviteForm />
    </div>
  );
}
