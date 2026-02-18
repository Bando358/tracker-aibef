import type { ActionAudit } from "@/app/generated/prisma/client";

export function buildAuditEntry(params: {
  action: ActionAudit;
  entite: string;
  entiteId?: string;
  userId: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}) {
  return {
    action: params.action,
    entite: params.entite,
    entiteId: params.entiteId ?? null,
    userId: params.userId,
    details: params.details ? JSON.stringify(params.details) : null,
    ipAddress: params.ipAddress ?? null,
  };
}
