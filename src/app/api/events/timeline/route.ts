import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/auth-guard";

export async function GET(req: Request) {
  try {
    requirePermission(req, "INVENTORY_VIEW");
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");

    // Return mock timeline items mapped to specific event
    const timelineData = [
      {
        id: "1",
        eventId: eventId || "1",
        summary: "Inquiry Created",
        details: "Lead captured from corporate website",
        loggedAt: new Date(Date.now() - 3600000 * 24 * 3),
      },
      {
        id: "2",
        eventId: eventId || "1",
        summary: "Quotation Generated",
        details: "Version 1 proposal sent to client",
        loggedAt: new Date(Date.now() - 3600000 * 24 * 2),
      },
      {
        id: "3",
        eventId: eventId || "1",
        summary: "Status Transitioned",
        details: "Status updated to CONFIRMED following deposit payment",
        loggedAt: new Date(Date.now() - 3600000),
      }
    ];

    return NextResponse.json(timelineData);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[API_EVENTS_TIMELINE_GET_ERROR]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
