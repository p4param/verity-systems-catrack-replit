import { EventRepository } from "../repositories/event-repository";
import { prisma } from "@/lib/prisma";

const repo = new EventRepository();

export class EventService {
  async getEventById(id: string) {
    return repo.getById(id);
  }

  async listEvents(tenantId: string, filters?: any) {
    return repo.list(tenantId, filters);
  }

  async createEvent(data: any) {
    return repo.create(data);
  }

  async updateEvent(id: string, version: number, data: any) {
    return repo.update(id, version, data);
  }

  async deleteEvent(id: string, deletedBy: string) {
    return repo.softDelete(id, deletedBy);
  }

  async calculateEventHealth(eventId: string): Promise<number> {
    const unresolvedTasks = await prisma.cateringEventTask.count({
      where: { eventId, status: { not: "COMPLETED" }, isDeleted: false },
    });

    const event = await repo.getById(eventId);
    if (!event) throw new Error("Event not found");

    let score = 100;
    if (unresolvedTasks > 0) {
      score -= unresolvedTasks * 5;
    }

    if (score < 0) score = 0;

    await prisma.cateringEventHealthScore.create({
      data: {
        tenantId: event.tenantId,
        companyId: event.companyId,
        branchId: event.branchId,
        eventId,
        score,
        createdBy: "00000000-0000-0000-0000-000000000000",
        updatedBy: "00000000-0000-0000-0000-000000000000",
      },
    });

    return score;
  }

  async calculateEventProfitability(eventId: string): Promise<any> {
    const costing = await prisma.cateringEventCosting.findFirst({
      where: { eventId },
    });

    const event = await repo.getById(eventId);
    if (!event || !costing) return null;

    const actualCost = Number(costing.actualFood) + Number(costing.actualLabor) + Number(costing.actualLogistics);
    const netProfit = event.budgetAmount - actualCost;
    const marginPct = event.budgetAmount > 0 ? (netProfit / event.budgetAmount) * 100 : 0;

    return {
      revenue: event.budgetAmount,
      cost: actualCost,
      netProfit,
      marginPercentage: marginPct,
    };
  }

  async detectCalendarConflicts(hallId: string, startAt: Date, endAt: Date): Promise<boolean> {
    const conflicts = await prisma.cateringEventFunction.count({
      where: {
        eventId: hallId,
        isDeleted: false,
        OR: [
          { startAt: { lte: startAt }, endAt: { gte: startAt } },
          { startAt: { lte: endAt }, endAt: { gte: endAt } },
        ],
      },
    });

    return conflicts > 0;
  }
}

export class EventCalendarService {
  async getEventsCalendar(tenantId: string) {
    const list = await prisma.cateringEvent.findMany({
      where: { tenantId, isDeleted: false },
    });
    return list.map((e) => ({
      id: e.id,
      eventId: e.id,
      title: e.name,
      startAt: e.startDate,
      endAt: e.endDate,
      calendarType: "EVENT",
    }));
  }
}

// ─── STATE MACHINE & WORKFLOW ENGINE ──────────────────────────────────────────

export class EventWorkflowService {
  private allowedTransitions: Record<string, string[]> = {
    INQUIRY: ["TENTATIVE", "CANCELLED"],
    TENTATIVE: ["QUOTATION", "CANCELLED"],
    QUOTATION: ["NEGOTIATION", "CANCELLED"],
    NEGOTIATION: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["PLANNING", "CANCELLED"],
    PLANNING: ["PRODUCTION", "CANCELLED"],
    PRODUCTION: ["DISPATCH", "CANCELLED"],
    DISPATCH: ["EXECUTION", "CANCELLED"],
    EXECUTION: ["SETTLEMENT", "CANCELLED"],
    SETTLEMENT: ["COMPLETED", "CANCELLED"],
    COMPLETED: ["ARCHIVED"],
    ARCHIVED: [],
    CANCELLED: ["TENTATIVE"], // Allow reopening cancelled events to tentative status
  };

  async changeStatus(eventId: string, targetStatusId: string, updatedBy: string) {
    const event = await prisma.cateringEvent.findFirst({
      where: { id: eventId, isDeleted: false },
      include: { status: true },
    });
    if (!event) throw new Error("Event not found");

    const targetStatus = await prisma.cateringEventStatus.findUnique({
      where: { id: targetStatusId },
    });
    if (!targetStatus) throw new Error("Target status not found");

    const currentCode = event.status.code;
    const targetCode = targetStatus.code;

    // 1. Guard check: Is the state transition valid?
    const validNextStates = this.allowedTransitions[currentCode] || [];
    if (!validNextStates.includes(targetCode)) {
      throw new Error(`Invalid Transition: Cannot transition from ${currentCode} to ${targetCode}`);
    }

    // 2. Preconditions & Business Rules check
    if (targetCode === "CONFIRMED") {
      // Rule: Confirmed status requires at least one signed document and a registered deposit payment
      const paymentCount = await prisma.cateringEventPayment.count({
        where: { eventId, isDeleted: false },
      });
      if (paymentCount === 0) {
        throw new Error("Precondition Failed: At least one deposit payment is required to confirm booking");
      }
    }

    // 3. Perform exit actions for current state
    await this.executeExitAction(currentCode, eventId);

    // 4. Perform transaction status update
    await prisma.$transaction([
      prisma.cateringEvent.update({
        where: { id: eventId },
        data: { statusId: targetStatusId, version: { increment: 1 }, updatedBy },
      }),
      prisma.cateringEventTimeline.create({
        data: {
          tenantId: event.tenantId,
          companyId: event.companyId,
          branchId: event.branchId,
          eventId,
          summary: "Status Changed",
          details: `Workflow transition from ${event.status.name} to ${targetStatus.name}`,
          createdBy: updatedBy,
          updatedBy,
        },
      }),
    ]);

    // 5. Perform entry actions for target state
    await this.executeEntryAction(targetCode, eventId, event, updatedBy);
  }

  private async executeExitAction(statusCode: string, eventId: string) {
    // Placeholder for exit action validations
    console.log(`Exiting state: ${statusCode} for Event: ${eventId}`);
  }

  private async executeEntryAction(statusCode: string, eventId: string, event: any, userId: string) {
    console.log(`Entering state: ${statusCode} for Event: ${eventId}`);

    // Action: Auto-generate checklists & tasks on CONFIRMED state
    if (statusCode === "CONFIRMED") {
      const defaultTasks = [
        { title: "Assign Kitchen Head Chef", description: "Designate lead kitchen chef for recipe scaling" },
        { title: "Verify Venue Accessibility", description: "Coordinate with logistics coordinator for truck access limits" },
      ];

      for (const t of defaultTasks) {
        await prisma.cateringEventTask.create({
          data: {
            tenantId: event.tenantId,
            companyId: event.companyId,
            branchId: event.branchId,
            eventId,
            title: t.title,
            description: t.description,
            createdBy: userId,
            updatedBy: userId,
          },
        });
      }

      // Add a confirmed timeline notification trigger
      await prisma.cateringEventNotification.create({
        data: {
          tenantId: event.tenantId,
          companyId: event.companyId,
          branchId: event.branchId,
          eventId,
          userId,
          channel: "IN_APP",
          title: "Checklist Initialized",
          body: "Standard BEO setup checklist has been automatically generated.",
          createdBy: userId,
          updatedBy: userId,
        },
      });
    }
  }
}
