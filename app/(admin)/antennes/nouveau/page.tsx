import Link from "next/link";
import { AntenneForm } from "@/components/antennes/antenne-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Nouvelle Antenne",
};

export default function NouvelleAntennePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/antennes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Nouvelle Antenne
          </h1>
          <p className="text-muted-foreground">
            Creez une nouvelle antenne pour l&apos;organisation.
          </p>
        </div>
      </div>
      <div className="max-w-2xl">
        <AntenneForm />
      </div>
    </div>
  );
}
