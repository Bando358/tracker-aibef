"use server";

import prisma from "@/lib/prisma";
import type { TypeNotification } from "@/app/generated/prisma/client";

export async function createNotification(data: {
  type: TypeNotification;
  titre: string;
  message: string;
  userId: string;
  lien?: string | null;
}) {
  return prisma.notification.create({
    data: {
      type: data.type,
      titre: data.titre,
      message: data.message,
      user: { connect: { id: data.userId } },
      lien: data.lien ?? null,
    },
  });
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, lue: false },
  });
}

export async function getNotifications(
  userId: string,
  page: number = 1,
  pageSize: number = 20
) {
  const skip = (page - 1) * pageSize;

  const [data, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.notification.count({ where: { userId } }),
  ]);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function markAsRead(notificationId: string) {
  return prisma.notification.update({
    where: { id: notificationId },
    data: { lue: true },
  });
}

export async function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, lue: false },
    data: { lue: true },
  });
}
