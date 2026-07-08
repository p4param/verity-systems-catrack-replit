import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/permission-guard";
import { CreateEventSchema } from "@/lib/inventory/validation";

export async function GET(req: Request) {
    try {
        const user = await requirePermission(req, "INVENTORY_VIEW");

        const events = await prisma.event.findMany({
            where: { tenantId: user.tenantId },
            include: {
                eventReservations: {
                    include: { apparel: true }
                }
            },
            orderBy: { eventDate: 'asc' }
        });

        // Add net-loss reports and movements
        const { RecoveryService } = await import("@/lib/inventory/recovery-service");
        const eventsWithReports = await Promise.all(events.map(async (event) => {
            const report = await RecoveryService.getNetLossReport(user.tenantId, {
                referenceType: 'EVENT',
                referenceId: event.id
            });

            const movements = await prisma.stockMovement.findMany({
                where: {
                    tenantId: user.tenantId,
                    referenceType: 'EVENT',
                    referenceId: event.id,
                    movementType: { in: ['MISSING', 'DAMAGE'] }
                },
                include: {
                    apparel: true,
                    recoveries: true
                }
            });

            return { ...event, netLossReport: report, movements };
        }));

        return NextResponse.json(eventsWithReports);
    } catch (error) {
        if (error instanceof Response) return error;
        console.error("[EVENTS_GET_ERROR]", error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const user = await requirePermission(req, "INVENTORY_MANAGE");
        const body = await req.json();

        const validated = CreateEventSchema.parse(body);

        const event = await prisma.$transaction(async (tx) => {
            const newEvent = await tx.event.create({
                data: {
                    tenantId: user.tenantId,
                    name: validated.name,
                    eventDate: validated.eventDate,
                    status: 'CONFIRMED'
                }
            });

            if (validated.reservations && validated.reservations.length > 0) {
                await tx.eventReservation.createMany({
                    data: validated.reservations.map(r => ({
                        tenantId: user.tenantId,
                        eventId: newEvent.id,
                        apparelId: r.apparelId,
                        reservedQty: r.reservedQty,
                        createdBy: user.sub,
                        status: 'ACTIVE'
                    }))
                });
            }

            return tx.event.findUnique({
                where: { id: newEvent.id },
                include: { eventReservations: { include: { apparel: true } } }
            });
        });

        return NextResponse.json(event);
    } catch (error) {
        if (error instanceof Response) return error;
        console.error("[EVENTS_POST_ERROR]", error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal Server Error" },
            { status: error instanceof Error && 'name' in error && error.name === 'ZodError' ? 400 : 500 }
        );
    }
}
