"use server";

import { prisma } from "@/lib/prisma";

export async function scheduleEvent(data: any) {
  return prisma.cateringEvent.create({
    data: {
      ...data,
      budgetAmount: data.budgetAmount ? data.budgetAmount.toString() : "0.00",
    },
  });
}

export async function rescheduleEvent(id: string, startAt: Date, endAt: Date, updatedBy: string) {
  const existing = await prisma.cateringEvent.findUnique({ where: { id } });
  if (!existing) throw new Error("Event not found");

  return prisma.cateringEvent.update({
    where: { id },
    data: {
      startDate: startAt,
      endDate: endAt,
      version: { increment: 1 },
      updatedBy,
    },
  });
}

export async function moveEvent(id: string, startAt: Date, endAt: Date, updatedBy: string) {
  return rescheduleEvent(id, startAt, endAt, updatedBy);
}

export async function resizeEvent(id: string, newEndAt: Date, updatedBy: string) {
  const existing = await prisma.cateringEvent.findUnique({ where: { id } });
  if (!existing) throw new Error("Event not found");

  return prisma.cateringEvent.update({
    where: { id },
    data: {
      endDate: newEndAt,
      version: { increment: 1 },
      updatedBy,
    },
  });
}
