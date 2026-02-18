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
  RESPONSABLE_ANTENNE: "Dashboard Antenne",
  ADMINISTRATIF: "Mon Espace",
  SOIGNANT: "Mon Espace",
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
    user.role === "RESPONSABLE_ANTENNE" && user.antenneName
      ? `Antenne de ${user.antenneName}`
      : undefined;

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
        <h1 className="text-2xl font-bold tracking-tight">
          {greeting}, {displayName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {title}
          {subtitle && (
            <span className="ml-1 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {subtitle}
            </span>
          )}
        </p>
      </div>
      <DashboardClient data={data} role={user.role} />
    </div>
  );
}
