import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/permission-guard";
import { CreateReservationSchema } from "@/lib/inventory/validation";
import { ReservationService } from "@/lib/inventory/reservation-service";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: Request) {
    try {
        const user = await requirePermission(req, "INVENTORY_VIEW");
        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get("eventId");

        const reservations = await prisma.eventReservation.findMany({
            where: {
                tenantId: user.tenantId,
                eventId: eventId ? parseInt(eventId) : undefined
            },
            include: { apparel: true, event: true }
        });

        return NextResponse.json(reservations);
    } catch (error) {
        if (error instanceof Response) return error;
        console.error("[RESERVATIONS_GET_ERROR]", error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const user = await requirePermission(req, "RESERVATION_MANAGE");
        const body = await req.json();
        const validated = CreateReservationSchema.parse(body);

        const reservation = await ReservationService.createReservation({
            tenantId: user.tenantId,
            ...validated,
            createdBy: user.sub
        });

        await createAuditLog({
            tenantId: user.tenantId,
            actorUserId: user.sub,
            action: "RESERVATION.CREATE",
            details: JSON.stringify(reservation),
            ipAddress: req.headers.get("x-forwarded-for") || "unknown"
        });

        return NextResponse.json(reservation, { status: 201 });
    } catch (error) {
        if (error instanceof Response) return error;
        console.error("[RESERVATIONS_POST_ERROR]", error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
