# Event Manager Backend Implementation (Next.js 15)

## 1. File: `src/modules/events/types/dto.ts`

```typescript
export interface EventDto {
  id: string;
  tenantId: string;
  companyId: string;
  branchId: string;
  eventNumber: string;
  name: string;
  typeId: string;
  statusId: string;
  priorityId: string;
  customerId: string;
  contactId: string;
  salesExecId: string;
  managerId?: string | null;
  bookingDate: Date;
  startDate: Date;
  endDate: Date;
  guestCount: number;
  budgetAmount: number;
  currency: string;
  remarks?: string | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface EventSummaryDto {
  eventId: string;
  eventNumber: string;
  eventName: string;
  eventType: string;
  eventStatus: string;
  eventPriority: string;
  startDate: Date;
  endDate: Date;
  guestCount: number;
  budgetAmount: number;
  totalActualCost: number;
  totalAmountPaid: number;
}

export interface EventCalendarDto {
  id: string;
  eventId: string;
  title: string;
  startAt: Date;
  endAt: Date;
  calendarType: string;
}

export interface EventDashboardDto {
  todayEventsCount: number;
  upcomingEventsCount: number;
  pendingConfirmationsCount: number;
  eventsByStatus: Record<string, number>;
  eventsByCity: Record<string, number>;
  monthlyRevenue: Record<string, number>;
  healthScoreAverage: number;
}
```

---

## 2. File: `src/modules/events/validations/schemas.ts`

```typescript
import { z } from "zod";

export const CreateEventSchema = z.zobject({
  name: z.string().min(3).max(255),
  typeId: z.string().uuid(),
  statusId: z.string().uuid(),
  priorityId: z.string().uuid(),
  customerId: z.string().uuid(),
  contactId: z.string().uuid(),
  salesExecId: z.string().uuid(),
  managerId: z.string().uuid().optional().nullable(),
  bookingDate: z.coerce.date(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  guestCount: z.number().int().positive(),
  budgetAmount: z.number().positive(),
  currency: z.string().length(3).default("USD"),
  remarks: z.string().optional().nullable(),
});

export const UpdateEventSchema = CreateEventSchema.partial().extend({
  version: z.number().int(),
});

export const EventFunctionSchema = z.zobject({
  name: z.string().min(2).max(150),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  guestCount: z.number().int().positive(),
});

export const EventTaskSchema = z.zobject({
  title: z.string().min(3).max(255),
  description: z.string().optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  status: z.enum(["DRAFT", "ASSIGNED", "COMPLETED"]),
});

export const EventPaymentSchema = z.zobject({
  amount: z.number().positive(),
  method: z.string(),
  transactionId: z.string().optional().nullable(),
});

export const EventSearchSchema = z.zobject({
  query: z.string().optional(),
  branchId: z.string().uuid().optional(),
  statusId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});
```

---

## 3. File: `src/modules/events/repositories/event-repository.ts`

```typescript
import { PrismaClient } from "@prisma/client";
import { EventDto } from "../types/dto";

const prisma = new PrismaClient();

export class EventRepository {
  async getById(id: string): Promise<EventDto | null> {
    const event = await prisma.event.findFirst({
      where: { id, isDeleted: false },
    });
    if (!event) return null;
    return {
      ...event,
      budgetAmount: Number(event.budgetAmount),
    };
  }

  async create(data: any): Promise<EventDto> {
    const created = await prisma.event.create({
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
    const existing = await prisma.event.findFirst({
      where: { id, version, isDeleted: false },
    });
    if (!existing) {
      throw new Error("Concurrency Conflict: Record was modified by another user");
    }

    const updated = await prisma.event.update({
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
    await prisma.event.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy,
      },
    });
  }
}
```

---

## 4. File: `src/modules/events/services/event-workflow-service.ts`

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class EventWorkflowService {
  async transitionStatus(eventId: string, targetStatusCode: string, userId: string): Promise<void> {
    const event = await prisma.event.findFirst({
      where: { id: eventId, isDeleted: false },
      include: { status: true },
    });

    if (!event) throw new Error("Event not found");

    const targetStatus = await prisma.eventStatus.findFirst({
      where: { code: targetStatusCode, companyId: event.companyId },
    });

    if (!targetStatus) throw new Error("Target status not defined");

    // Perform validation rules on status change
    if (targetStatusCode === "CONFIRMED") {
      // Ensure budget and contract documents are attached
      const costing = await prisma.eventCosting.findUnique({ where: { eventId } });
      if (!costing) throw new Error("Cannot confirm event without financial costing setups");
    }

    await prisma.$transaction([
      prisma.event.update({
        where: { id: eventId },
        data: { statusId: targetStatus.id, version: { increment: 1 } },
      }),
      prisma.eventTimeline.create({
        data: {
          eventId,
          summary: `Status transitioned to ${targetStatus.name}`,
          details: `Transitioned from ${event.status.name} to ${targetStatus.name}`,
        },
      }),
    ]);
  }
}
```

---

## 5. File: `src/app/api/events/route.ts`

```typescript
import { NextResponse } from "next/server";
import { EventRepository } from "@/modules/events/repositories/event-repository";
import { CreateEventSchema } from "@/modules/events/validations/schemas";

const repo = new EventRepository();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = CreateEventSchema.parse(body);

    // Mock Context variables (tenant and user extracted from session)
    const context = {
      tenantId: "8ee8a6c8-5dc6-4113-8898-0c67f4c54093",
      companyId: "2444c125-9ef1-4bdf-87f5-8d5cb5b2632b",
      branchId: "6475a34e-4f7f-4318-ae7f-0b32ee7c2a4c",
      salesExecId: "3673f1d8-04ff-44e2-a05e-8557b447814b",
    };

    // Generate Event Number using stored procedure
    // SELECT events.fn_generate_event_number(:branchId, :year)
    const eventNumber = `EV-2026-T-${Math.floor(1000 + Math.random() * 9000)}`;

    const event = await repo.create({
      ...validated,
      ...context,
      eventNumber,
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 400 });
  }
}
```

---

## 6. File: `src/app/api/events/[id]/route.ts`

```typescript
import { NextResponse } from "next/server";
import { EventRepository } from "@/modules/events/repositories/event-repository";
import { UpdateEventSchema } from "@/modules/events/validations/schemas";

const repo = new EventRepository();

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const event = await repo.getById(params.id);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  return NextResponse.json(event);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const validated = UpdateEventSchema.parse(body);
    
    const updated = await repo.update(params.id, body.version, validated);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Update failed" }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    // Soft delete
    const deletedBy = "3673f1d8-04ff-44e2-a05e-8557b447814b";
    await repo.softDelete(params.id, deletedBy);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Delete failed" }, { status: 400 });
  }
}
```
