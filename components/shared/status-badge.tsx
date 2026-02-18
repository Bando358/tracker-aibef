import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  // Activite
  PLANIFIEE: "bg-blue-100 text-blue-700 border-blue-200",
  EN_COURS: "bg-amber-100 text-amber-700 border-amber-200",
  REALISEE: "bg-green-100 text-green-700 border-green-200",
  EN_RETARD: "bg-red-100 text-red-700 border-red-200",
  ANNULEE: "bg-gray-100 text-gray-700 border-gray-200",
  REPROGRAMMEE: "bg-purple-100 text-purple-700 border-purple-200",
  // Recommandation
  EN_ATTENTE: "bg-slate-100 text-slate-700 border-slate-200",
  PARTIELLEMENT_REALISEE: "bg-orange-100 text-orange-700 border-orange-200",
  RESOLUE: "bg-green-100 text-green-700 border-green-200",
  // Conge
  BROUILLON: "bg-gray-100 text-gray-600 border-gray-200",
  SOUMIS: "bg-blue-100 text-blue-700 border-blue-200",
  APPROUVE_RESPONSABLE: "bg-cyan-100 text-cyan-700 border-cyan-200",
  APPROUVE_FINAL: "bg-green-100 text-green-700 border-green-200",
  REFUSE: "bg-red-100 text-red-700 border-red-200",
  ANNULE: "bg-gray-100 text-gray-500 border-gray-200",
  // Pointage
  PRESENT: "bg-green-100 text-green-700 border-green-200",
  ABSENT: "bg-red-100 text-red-700 border-red-200",
  RETARD: "bg-amber-100 text-amber-700 border-amber-200",
  CONGE: "bg-blue-100 text-blue-700 border-blue-200",
  // Priorite
  HAUTE: "bg-red-100 text-red-700 border-red-200",
  MOYENNE: "bg-amber-100 text-amber-700 border-amber-200",
  BASSE: "bg-green-100 text-green-700 border-green-200",
};

interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const colorClasses = STATUS_COLORS[status] ?? "bg-gray-100 text-gray-700 border-gray-200";

  return (
    <Badge
      variant="outline"
      className={cn(colorClasses, "font-medium", className)}
    >
      {label ?? status.replace(/_/g, " ")}
    </Badge>
  );
}
