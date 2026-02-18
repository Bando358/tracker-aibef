import { EmployeForm } from "@/components/employes/employe-form";

export const dynamic = 'force-dynamic';

export default function NouvelEmployePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nouvel Employe</h1>
        <p className="text-muted-foreground">
          Creez un nouveau compte employe
        </p>
      </div>

      <EmployeForm />
    </div>
  );
}
