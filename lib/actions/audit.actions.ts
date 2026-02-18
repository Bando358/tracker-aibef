"use server";

import prisma from "@/lib/prisma";
import type { ActionAudit } from "@/app/generated/prisma/client";
import { PAGINATION_DEFAULT } from "@/lib/constants";

export async function createAuditLog(data: {
  action: ActionAudit;
  entite: string;
  entiteId?: string | null;
  userId: string;
  details?: string | null;
  ipAddress?: string | null;
}) {
  return prisma.auditLog.create({
    data: {
      action: data.action,
      entite: data.entite,
      entiteId: data.entiteId ?? null,
      details: data.details ?? null,
      ipAddress: data.ipAddress ?? null,
      user: { connect: { id: data.userId } },
    },
  });
}

export async function getAuditLogs(params: {
  search?: string;
  page?: number;
  pageSize?: number;
  entite?: string;
  userId?: string;
  action?: ActionAudit;
}) {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? PAGINATION_DEFAULT;
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};

  if (params.entite) where.entite = params.entite;
  if (params.userId) where.userId = params.userId;
  if (params.action) where.action = params.action;
  if (params.search) {
    where.OR = [
      { entite: { contains: params.search, mode: "insensitive" } },
      { details: { contains: params.search, mode: "insensitive" } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { nom: true, prenom: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
