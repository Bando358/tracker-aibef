import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/actions/auth.actions";
import { fetchDashboardData } from "@/lib/actions/dashboard.actions";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard - TRACKER AIBEF",
};

const PAGE_TITLES: Record<string, string> = {
  SUPER_ADMIN: "Dashboard National",
  ADMIN_SIMPLE: "Dashboard National",
  RESPONSABLE_ANTENNE: "Dashboard Antenne",
  ADMIN_ANTENNE: "Dashboard Antenne",
  PERSONNEL: "Mon Espace",
  VOLONTAIRE: "Mon Espace",
  MAJ: "Mon Espace",
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bonjour";
  if (hour < 18) return "Bon apres-midi";
  return "Bonsoir";
}

export default async function DashboardPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  const data = await fetchDashboardData(user.id, user.role, user.antenneId);

  const title = PAGE_TITLES[user.role] ?? "Dashboard";
  const greeting = getGreeting();
  const displayName = user.nom ?? user.username ?? "";
  const subtitle =
    (user.role === "RESPONSABLE_ANTENNE" || user.role === "ADMIN_ANTENNE") && user.antenneName
      ? `Antenne de ${user.antenneName}`
      : undefined;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Premium welcome hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white shadow-lg shadow-blue-600/25">
        {/* Decorative elements */}
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/5" />
        <div className="absolute right-8 top-8 h-3 w-3 rounded-full bg-white/20" />
        <div className="absolute right-20 top-16 h-2 w-2 rounded-full bg-white/15" />
        <div className="absolute left-1/3 -top-10 h-28 w-28 rounded-full bg-white/[0.07]" />

        <div className="relative">
          <p className="text-sm font-medium text-white/70">{title}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            {greeting},{" "}
            <span className="text-white">
              {displayName}
            </span>
          </h1>
          {subtitle && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5">
              <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
              <span className="text-sm font-medium text-white">
                {subtitle}
              </span>
            </div>
          )}
        </div>
      </div>

      <DashboardClient data={data} role={user.role} />
    </div>
  );
}
