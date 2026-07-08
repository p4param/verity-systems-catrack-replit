import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/auth-guard";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    requirePermission(req, "INVENTORY_VIEW");
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");

    if (!eventId) {
      return NextResponse.json({ message: "eventId is required" }, { status: 400 });
    }

    const event = await prisma.cateringEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }

    // Check for double bookings at same branch/start date
    const overlaps = await prisma.cateringEvent.count({
      where: {
        branchId: event.branchId,
        id: { not: eventId },
        isDeleted: false,
        OR: [
          { startDate: { lte: event.startDate }, endDate: { gte: event.startDate } },
          { startDate: { lte: event.endDate }, endDate: { gte: event.endDate } },
        ],
      },
    });

    return NextResponse.json({
      hasConflict: overlaps > 0,
      conflictsCount: overlaps,
      message: overlaps > 0 ? "Double booking detected for this branch/time slot." : "No scheduling conflicts detected.",
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[API_CALENDAR_CONFLICTS_GET_ERROR]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
