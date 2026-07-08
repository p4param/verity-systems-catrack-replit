import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permission-guard";
import { EventService } from "@/lib/inventory/event-service";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await requirePermission(req, "RESERVATION_MANAGE");
        const { id } = await params;
        const eventId = parseInt(id);
        const body = await req.json();

        // results: { apparelId: number, returnedQty: number, damagedQty: number, lostQty: number, allottedQty: number }[]
        const result = await EventService.reconcileEvent(user.tenantId, eventId, body.results, user.sub);

        return NextResponse.json(result);
    } catch (err: any) {
        console.error("Reconciliation API Error:", err);
        return NextResponse.json({ error: err.message }, { status: 400 });
    }
}
