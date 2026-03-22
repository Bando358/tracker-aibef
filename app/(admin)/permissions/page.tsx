import { redirect } from "next/navigation";
import { Shield } from "lucide-react";
import { getSessionUser } from "@/lib/actions/auth.actions";
import prisma from "@/lib/prisma";
import { getUserPermissions } from "@/lib/actions/permission.actions";
import { PermissionPageClient } from "@/components/permissions/permission-page-client";
import { ROLE_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const metadata = { title: "Permissions | TRACKER-AIBEF" };

export default async function PermissionsPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  if (!["SUPER_ADMIN", "ADMIN_SIMPLE", "RESPONSABLE_ANTENNE", "ADMIN_ANTENNE"].includes(session.role)) {
    redirect("/dashboard");
  }

  // Charger tous les utilisateurs avec leurs permissions
  const whereClause: Record<string, unknown> = { isActive: true };
  if ((session.role === "RESPONSABLE_ANTENNE" || session.role === "ADMIN_ANTENNE") && session.antenneId) {
    whereClause.antenneId = session.antenneId;
  }

  const users = await prisma.user.findMany({
    where: whereClause,
    select: {
      id: true,
      nom: true,
      prenom: true,
      role: true,
      antenne: { select: { nom: true } },
    },
    orderBy: [{ role: "asc" }, { nom: "asc" }],
  });

  // Charger les permissions de chaque utilisateur
  const usersWithPerms = await Promise.all(
    users.map(async (u) => ({
      ...u,
      antenne: u.antenne?.nom ?? null,
      roleLabel: ROLE_LABELS[u.role] ?? u.role,
      permissions: await getUserPermissions(u.id),
    }))
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 p-4 sm:p-6 text-white shadow-md sm:shadow-lg">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10 hidden sm:block" />
        <div className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-white/5 hidden sm:block" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Gestion des permissions</h1>
            <p className="text-xs sm:text-sm text-white/80">
              Gerez les droits d&apos;acces de chaque utilisateur
            </p>
          </div>
        </div>
      </div>

      <PermissionPageClient users={JSON.parse(JSON.stringify(usersWithPerms))} />
    </div>
  );
}
