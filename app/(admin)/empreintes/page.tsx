import { redirect } from "next/navigation";
import { Fingerprint } from "lucide-react";
import { getSessionUser } from "@/lib/actions/auth.actions";
import { getUtilisateursAvecEmpreintes } from "@/lib/actions/empreinte.actions";
import { EnrollmentClient } from "@/components/fingerprint/enrollment-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Empreintes digitales | TRACKER-AIBEF",
};

export default async function EmpreintesPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  if (
    session.role !== "SUPER_ADMIN" &&
    session.role !== "ADMIN_SIMPLE" &&
    session.role !== "RESPONSABLE_ANTENNE" &&
    session.role !== "ADMIN_ANTENNE"
  ) {
    redirect("/dashboard");
  }

  const employes = await getUtilisateursAvecEmpreintes();
  const serialized = JSON.parse(JSON.stringify(employes));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 p-6 text-white shadow-lg shadow-rose-500/25">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-white/5" />
        <div className="absolute right-12 top-3 h-2.5 w-2.5 rounded-full bg-white/20" />
        <div className="absolute right-[7rem] top-8 h-1.5 w-1.5 rounded-full bg-white/15" />
        <div className="absolute left-1/3 -top-8 h-24 w-24 rounded-full bg-white/[0.07]" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <Fingerprint className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Empreintes digitales</h1>
            <p className="text-sm text-white/80">
              Enrolez et gerez les empreintes digitales des employes
            </p>
          </div>
        </div>
      </div>

      <EnrollmentClient employes={serialized} />
    </div>
  );
}
