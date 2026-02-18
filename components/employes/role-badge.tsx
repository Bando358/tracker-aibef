import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/constants";
import type { RoleType } from "@/types";

const ROLE_COLORS: Record<RoleType, string> = {
  SUPER_ADMIN: "bg-red-100 text-red-800 border-red-200",
  RESPONSABLE_ANTENNE: "bg-blue-100 text-blue-700 border-blue-200",
  ADMINISTRATIF: "bg-amber-100 text-amber-700 border-amber-200",
  SOIGNANT: "bg-green-100 text-green-700 border-green-200",
};

interface RoleBadgeProps {
  role: RoleType;
  className?: string;
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(ROLE_COLORS[role], "font-medium", className)}
    >
      {ROLE_LABELS[role] ?? role}
    </Badge>
  );
}
