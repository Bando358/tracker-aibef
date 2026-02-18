import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/actions/auth.actions";
import { CongeList } from "@/components/conges/conge-list";

export const dynamic = 'force-dynamic';

export default async function CongesPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const isManager =
    session.role === "SUPER_ADMIN" ||
    session.role === "RESPONSABLE_ANTENNE";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gestion des conges</h1>
        <p className="text-muted-foreground">
          {isManager
            ? "Gerez vos demandes et approuvez celles de votre equipe"
            : "Consultez et gerez vos demandes de conge"}
        </p>
      </div>

      <CongeList
        userId={session.id}
        userRole={session.role}
        showApprovalTab={isManager}
      />
    </div>
  );
}
