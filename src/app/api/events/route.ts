import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/auth-guard";
import { prisma } from "@/lib/prisma";
import { CreateEventSchema } from "@/modules/events/validations";

export async function GET(req: Request) {
  try {
    const user = requirePermission(req, "INVENTORY_VIEW");
    const tenantUuid = "00000000-0000-0000-0000-" + user.tenantId.toString().padStart(12, "0");
    const { searchParams } = new URL(req.url);

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(200, parseInt(searchParams.get("limit") || "50"));
    const skip = (page - 1) * limit;

    // Search
    const query = searchParams.get("query") || undefined;

    // Filters
    const statusId = searchParams.get("statusId") || undefined;
    const typeId = searchParams.get("typeId") || undefined;
    const branchId = searchParams.get("branchId") || undefined;
    const salesExecId = searchParams.get("salesExecId") || undefined;
    const managerId = searchParams.get("managerId") || undefined;
    const customerId = searchParams.get("customerId") || undefined;
    const startDateFrom = searchParams.get("startDateFrom") || undefined;
    const startDateTo = searchParams.get("startDateTo") || undefined;
    const createdFrom = searchParams.get("createdFrom") || undefined;
    const createdTo = searchParams.get("createdTo") || undefined;

    // Sort
    const sortField = searchParams.get("sortField") || "startDate";
    const sortDir = (searchParams.get("sortDir") === "asc" ? "asc" : "desc") as "asc" | "desc";

    const where: any = {
      tenantId: tenantUuid,
      isDeleted: false,
    };

    if (statusId) where.statusId = statusId;
    if (typeId) where.typeId = typeId;
    if (branchId) where.branchId = branchId;
    if (salesExecId) where.salesExecId = salesExecId;
    if (managerId) where.managerId = managerId;
    if (customerId) where.customerId = customerId;

    if (startDateFrom || startDateTo) {
      where.startDate = {};
      if (startDateFrom) where.startDate.gte = new Date(startDateFrom);
      if (startDateTo) where.startDate.lte = new Date(startDateTo);
    }

    if (createdFrom || createdTo) {
      where.createdAt = {};
      if (createdFrom) where.createdAt.gte = new Date(createdFrom);
      if (createdTo) where.createdAt.lte = new Date(createdTo);
    }

    if (query) {
      where.OR = [
        { eventNumber: { contains: query, mode: "insensitive" } },
        { name: { contains: query, mode: "insensitive" } },
        { remarks: { contains: query, mode: "insensitive" } },
      ];
    }

    const validSortFields: Record<string, any> = {
      startDate: { startDate: sortDir },
      name: { name: sortDir },
      eventNumber: { eventNumber: sortDir },
      createdAt: { createdAt: sortDir },
      budgetAmount: { budgetAmount: sortDir },
    };
    const orderBy = validSortFields[sortField] || { startDate: sortDir };

    const [events, total] = await Promise.all([
      prisma.cateringEvent.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          status: { select: { id: true, name: true, code: true } },
          type: { select: { id: true, name: true, code: true } },
          priority: { select: { id: true, name: true, code: true } },
          venues: { take: 1, select: { id: true } },
          functions: { select: { id: true, name: true, pax: true }, take: 5 },
          costing: { select: { invoiceTotal: true, totalActualCost: true, amountPaid: true } },
          healthScores: { take: 1, orderBy: { calculatedAt: "desc" }, select: { score: true, calculatedAt: true } },
        },
      }),
      prisma.cateringEvent.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      events,
      pagination: { total, page, limit, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[API_EVENTS_GET_ERROR]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = requirePermission(req, "INVENTORY_MANAGE");
    const tenantUuid = "00000000-0000-0000-0000-" + user.tenantId.toString().padStart(12, "0");
    const creatorUuid = "00000000-0000-0000-0000-" + user.sub.toString().padStart(12, "0");

    const body = await req.json();
    const validated = CreateEventSchema.parse(body);

    const event = await prisma.$transaction(async (tx) => {
      // 1. Create main catering event
      const newEvent = await tx.cateringEvent.create({
        data: {
          ...validated,
          tenantId: tenantUuid,
          companyId: tenantUuid,
          branchId: validated.branchId || tenantUuid,
          createdBy: creatorUuid,
          updatedBy: creatorUuid,
          eventNumber: `EV-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        },
      });

      // 2. Create functions if provided
      if (body.functions && Array.isArray(body.functions)) {
        await Promise.all(
          body.functions.map((fn: any) =>
            tx.cateringEventFunction.create({
              data: {
                tenantId: tenantUuid,
                companyId: tenantUuid,
                branchId: validated.branchId || tenantUuid,
                eventId: newEvent.id,
                name: fn.name || "Function",
                startAt: new Date(fn.startAt || validated.startDate),
                endAt: new Date(fn.endAt || validated.endDate),
                guestCount: Number(fn.pax || validated.guestCount),
                createdBy: creatorUuid,
                updatedBy: creatorUuid,
              },
            })
          )
        );
      }

      // 3. Create venues if provided
      if (body.venues && Array.isArray(body.venues)) {
        await Promise.all(
          body.venues.map((venue: any, idx: number) =>
            tx.cateringEventVenue.create({
              data: {
                tenantId: tenantUuid,
                companyId: tenantUuid,
                branchId: validated.branchId || tenantUuid,
                eventId: newEvent.id,
                venueId: venue.venueId || "00000000-0000-0000-0000-000000000001",
                rentAmount: "0.0",
                contractSigned: false,
                createdBy: creatorUuid,
                updatedBy: creatorUuid,
              },
            })
          )
        );

        // Also save custom layout capacity details as notes
        await Promise.all(
          body.venues.map((venue: any, idx: number) => {
            const content = `Venue Name: ${venue.venueName || "Unnamed"}\nAddress: ${venue.address || "N/A"}\nCity: ${venue.city || "N/A"}\nCapacity: ${venue.capacity || 0}\nLayout Type: ${venue.layoutType || "Banquet"}\nNotes: ${venue.notes || ""}`;
            return tx.cateringEventNote.create({
              data: {
                tenantId: tenantUuid,
                companyId: tenantUuid,
                branchId: validated.branchId || tenantUuid,
                eventId: newEvent.id,
                title: `Venue Details - ${venue.venueName || `Venue #${idx + 1}`}`,
                content,
                createdBy: creatorUuid,
                updatedBy: creatorUuid,
              },
            });
          })
        );
      }

      // 4. Create costing
      const estimatedFood = Number(body.estimatedFood || 0);
      const estimatedLabor = Number(body.estimatedLabor || 0);
      const estimatedLogistics = Number(body.estimatedLogistics || 0);
      const advanceAmount = Number(body.advanceAmount || 0);

      await tx.cateringEventCosting.create({
        data: {
          tenantId: tenantUuid,
          companyId: tenantUuid,
          branchId: validated.branchId || tenantUuid,
          eventId: newEvent.id,
          estimatedFood: estimatedFood.toString(),
          estimatedLabor: estimatedLabor.toString(),
          estimatedLogistics: estimatedLogistics.toString(),
          actualFood: "0.0",
          actualLabor: "0.0",
          actualLogistics: "0.0",
          createdBy: creatorUuid,
          updatedBy: creatorUuid,
        },
      });

      // 5. Create payment record for advance if provided
      if (advanceAmount > 0) {
        await tx.cateringEventPayment.create({
          data: {
            tenantId: tenantUuid,
            companyId: tenantUuid,
            branchId: validated.branchId || tenantUuid,
            eventId: newEvent.id,
            amount: advanceAmount.toString(),
            method: "BANK_TRANSFER",
            transactionId: `ADV-${Date.now()}`,
            createdBy: creatorUuid,
            updatedBy: creatorUuid,
          },
        });
      }

      // 6. Create resource requirements for Step 5: Requirements and Step 8: Staff
      if (body.requirements && Array.isArray(body.requirements)) {
        await Promise.all(
          body.requirements.map((req: any) =>
            tx.cateringEventResourceRequirement.create({
              data: {
                tenantId: tenantUuid,
                companyId: tenantUuid,
                branchId: validated.branchId || tenantUuid,
                eventId: newEvent.id,
                resourceType: req.category || "AV Equipment",
                quantity: Number(req.quantity || 1),
                createdBy: creatorUuid,
                updatedBy: creatorUuid,
              },
            })
          )
        );
      }

      if (body.staffRequirements && Array.isArray(body.staffRequirements)) {
        await Promise.all(
          body.staffRequirements.map((staff: any) =>
            tx.cateringEventResourceRequirement.create({
              data: {
                tenantId: tenantUuid,
                companyId: tenantUuid,
                branchId: validated.branchId || tenantUuid,
                eventId: newEvent.id,
                resourceType: `STAFF_${staff.role || "Waiter"}`,
                quantity: Number(staff.count || 1),
                createdBy: creatorUuid,
                updatedBy: creatorUuid,
              },
            })
          )
        );
      }

      // 7. Save custom menu items and special instructions/notes as CateringEventNotes
      if (body.specialInstructions) {
        await tx.cateringEventNote.create({
          data: {
            tenantId: tenantUuid,
            companyId: tenantUuid,
            branchId: validated.branchId || tenantUuid,
            eventId: newEvent.id,
            title: "Special Instructions",
            content: body.specialInstructions,
            createdBy: creatorUuid,
            updatedBy: creatorUuid,
          },
        });
      }

      if (body.menuItems && Array.isArray(body.menuItems) && body.menuItems.length > 0) {
        const menuLines = body.menuItems
          .map((m: any, idx: number) => `${idx + 1}. ${m.name} (${m.category}) - Serving: ${m.servingType}${m.estimatedCost ? `, Est Cost: ${m.estimatedCost}` : ""}`)
          .join("\n");
        const menuContent = `Notes: ${body.menuNotes || ""}\n\nPlanned Items:\n${menuLines}`;
        await tx.cateringEventNote.create({
          data: {
            tenantId: tenantUuid,
            companyId: tenantUuid,
            branchId: validated.branchId || tenantUuid,
            eventId: newEvent.id,
            title: "Menu Planning Selection",
            content: menuContent,
            createdBy: creatorUuid,
            updatedBy: creatorUuid,
          },
        });
      }

      if (body.notes) {
        await tx.cateringEventNote.create({
          data: {
            tenantId: tenantUuid,
            companyId: tenantUuid,
            branchId: validated.branchId || tenantUuid,
            eventId: newEvent.id,
            title: "Customer Notes",
            content: body.notes,
            createdBy: creatorUuid,
            updatedBy: creatorUuid,
          },
        });
      }

      if (body.internalNotes) {
        await tx.cateringEventNote.create({
          data: {
            tenantId: tenantUuid,
            companyId: tenantUuid,
            branchId: validated.branchId || tenantUuid,
            eventId: newEvent.id,
            title: "Internal Notes",
            content: body.internalNotes,
            createdBy: creatorUuid,
            updatedBy: creatorUuid,
          },
        });
      }

      return newEvent;
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("[API_EVENTS_POST_ERROR]", error);
    return NextResponse.json(
      { message: error.message || "Bad Request" },
      { status: error.name === "ZodError" ? 400 : 500 }
    );
  }
}
