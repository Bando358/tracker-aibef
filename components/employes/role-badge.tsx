import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/constants";
import type { RoleType } from "@/types";

const ROLE_COLORS: Record<RoleType, string> = {
  SUPER_ADMIN: "bg-red-100 text-red-800 border-red-200",
  ADMIN_SIMPLE: "bg-orange-100 text-orange-800 border-orange-200",
  RESPONSABLE_ANTENNE: "bg-blue-100 text-blue-700 border-blue-200",
  ADMIN_ANTENNE: "bg-indigo-100 text-indigo-700 border-indigo-200",
  PERSONNEL: "bg-green-100 text-green-700 border-green-200",
  VOLONTAIRE: "bg-teal-100 text-teal-700 border-teal-200",
  MAJ: "bg-violet-100 text-violet-700 border-violet-200",
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
