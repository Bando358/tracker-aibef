import { STATUT_ACTIVITE_LABELS } from "@/lib/constants";
import { StatusBadge } from "@/components/shared/status-badge";
import type { StatutActiviteType } from "@/types";

interface ActiviteStatusBadgeProps {
  statut: StatutActiviteType;
  className?: string;
}

export function ActiviteStatusBadge({
  statut,
  className,
}: ActiviteStatusBadgeProps) {
  return (
    <StatusBadge
      status={statut}
      label={STATUT_ACTIVITE_LABELS[statut] ?? statut}
      className={className}
    />
  );
}
