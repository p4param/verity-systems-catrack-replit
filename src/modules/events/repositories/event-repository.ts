import { prisma } from "@/lib/prisma";
import { EventDto } from "../types";

export class EventRepository {
  async getById(id: string): Promise<EventDto | null> {
    const event = await prisma.cateringEvent.findFirst({
      where: { id, isDeleted: false },
    });
    if (!event) return null;

    return {
      id: event.id,
      tenantId: event.tenantId,
      companyId: event.companyId,
      branchId: event.branchId,
      eventNumber: event.eventNumber,
      name: event.name,
      typeId: event.typeId,
      statusId: event.statusId,
      priorityId: event.priorityId,
      customerId: event.customerId,
      contactId: event.contactId,
      salesExecId: event.salesExecId,
      managerId: event.managerId,
      bookingDate: event.bookingDate,
      startDate: event.startDate,
      endDate: event.endDate,
      guestCount: event.guestCount,
      budgetAmount: Number(event.budgetAmount),
      currency: event.currency,
      remarks: event.remarks,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      version: event.version,
    };
  }

  async create(data: any): Promise<EventDto> {
    const created = await prisma.cateringEvent.create({
      data: {
        ...data,
        budgetAmount: data.budgetAmount.toString(),
      },
    });
    return {
      ...created,
      budgetAmount: Number(created.budgetAmount),
    };
  }

  async update(id: string, version: number, data: any): Promise<EventDto> {
    // Perform optimistic concurrency check
    const existing = await prisma.cateringEvent.findFirst({
      where: { id, version, isDeleted: false },
    });
    if (!existing) {
      throw new Error("Concurrency Conflict: Record was modified by another user");
    }

    const updated = await prisma.cateringEvent.update({
      where: { id },
      data: {
        ...data,
        version: version + 1,
        budgetAmount: data.budgetAmount ? data.budgetAmount.toString() : undefined,
      },
    });

    return {
      ...updated,
      budgetAmount: Number(updated.budgetAmount),
    };
  }

  async softDelete(id: string, deletedBy: string): Promise<void> {
    await prisma.cateringEvent.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy,
      },
    });
  }

  async list(tenantId: string, filters?: any): Promise<EventDto[]> {
    const list = await prisma.cateringEvent.findMany({
      where: {
        tenantId,
        isDeleted: false,
        ...(filters?.query ? { name: { contains: filters.query, mode: "insensitive" } } : {}),
      },
      orderBy: { startDate: "asc" },
    });

    return list.map((event) => ({
      id: event.id,
      tenantId: event.tenantId,
      companyId: event.companyId,
      branchId: event.branchId,
      eventNumber: event.eventNumber,
      name: event.name,
      typeId: event.typeId,
      statusId: event.statusId,
      priorityId: event.priorityId,
      customerId: event.customerId,
      contactId: event.contactId,
      salesExecId: event.salesExecId,
      managerId: event.managerId,
      bookingDate: event.bookingDate,
      startDate: event.startDate,
      endDate: event.endDate,
      guestCount: event.guestCount,
      budgetAmount: Number(event.budgetAmount),
      currency: event.currency,
      remarks: event.remarks,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      version: event.version,
    }));
  }
}

export class EventFunctionRepository {
  async create(eventId: string, data: any) {
    return prisma.cateringEventFunction.create({
      data: {
        eventId,
        ...data,
      },
    });
  }
}

export class EventTaskRepository {
  async create(eventId: string, data: any) {
    return prisma.cateringEventTask.create({
      data: {
        eventId,
        ...data,
      },
    });
  }
}

export class EventDocumentRepository {
  async create(eventId: string, data: any) {
    return prisma.cateringEventDocument.create({
      data: {
        eventId,
        ...data,
      },
    });
  }
}

export class EventPaymentRepository {
  async create(eventId: string, data: any) {
    return prisma.cateringEventPayment.create({
      data: {
        eventId,
        ...data,
        amount: data.amount.toString(),
      },
    });
  }
}

export class EventTimelineRepository {
  async create(eventId: string, data: any) {
    return prisma.cateringEventTimeline.create({
      data: {
        eventId,
        ...data,
      },
    });
  }
}

export class EventCalendarRepository {
  async create(eventId: string, data: any) {
    return prisma.cateringEventCalendar.create({
      data: {
        eventId,
        ...data,
      },
    });
  }
}
