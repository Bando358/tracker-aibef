import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ClipboardPlus } from "lucide-react";

import { RecommandationForm } from "@/components/recommandations/recommandation-form";
import { Button } from "@/components/ui/button";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Nouvelle recommandation | TRACKER-AIBEF",
  description: "Creer une nouvelle recommandation",
};

export default function NouvelleRecommandationPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 p-6 text-white shadow-lg shadow-indigo-500/25">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-white/5" />
        <div className="absolute right-12 top-3 h-2.5 w-2.5 rounded-full bg-white/20" />
        <div className="absolute right-[7rem] top-8 h-1.5 w-1.5 rounded-full bg-white/15" />
        <div className="absolute left-1/3 -top-8 h-24 w-24 rounded-full bg-white/[0.07]" />
        <div className="relative flex items-center gap-4">
          <Button variant="outline" size="icon" asChild className="shrink-0 rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
            <Link href="/recommandations">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <ClipboardPlus className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Nouvelle recommandation
            </h1>
            <p className="text-sm text-white/80">
              Creez une nouvelle recommandation et assignez des responsables.
            </p>
          </div>
        </div>
      </div>
      <RecommandationForm />
    </div>
  );
}
