import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/auth-guard";
import { prisma } from "@/lib/prisma";
import { toCanonicalUuid } from "@/lib/auth/identity-uuid";

export async function GET(req: Request) {
  try {
    const user = requirePermission(req, "INVENTORY_VIEW");
    const tenantUuid = toCanonicalUuid(user.tenantId);

    const events = await prisma.cateringEvent.findMany({
      where: { tenantId: tenantUuid, isDeleted: false },
    });

    const calendarEvents = events.map((e) => ({
      id: e.id,
      title: e.name,
      start: e.startDate,
      end: e.endDate,
      color: "#3b82f6",
    }));

    return NextResponse.json(calendarEvents);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[API_EVENTS_CALENDAR_GET_ERROR]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
