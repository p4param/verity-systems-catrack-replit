import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/auth-guard";

export async function GET(req: Request) {
  try {
    requirePermission(req, "INVENTORY_VIEW");
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");

    const tasksData = [
      {
        id: "1",
        eventId: eventId || "1",
        title: "Confirm Guest Count",
        description: "Verify final RSVP count with the main corporate sponsor",
        priority: "HIGH",
        status: "ASSIGNED",
        createdAt: new Date(),
      },
      {
        id: "2",
        eventId: eventId || "1",
        title: "Kitchen Recipe Allocation",
        description: "Generate cooking sheet templates for executive chef",
        priority: "MEDIUM",
        status: "DRAFT",
        createdAt: new Date(),
      }
    ];

    return NextResponse.json(tasksData);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[API_EVENTS_TASKS_GET_ERROR]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
