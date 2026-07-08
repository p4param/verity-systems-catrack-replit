import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/auth-guard";
import { rescheduleEvent } from "@/modules/events/actions/calendar";

export async function POST(req: Request) {
  try {
    const user = requirePermission(req, "INVENTORY_MANAGE");
    const updatedByUuid = "00000000-0000-0000-0000-" + user.sub.toString().padStart(12, "0");

    const body = await req.json();
    const { id, startAt, endAt } = body;

    if (!id || !startAt || !endAt) {
      return NextResponse.json({ message: "id, startAt, and endAt are required" }, { status: 400 });
    }

    const updated = await rescheduleEvent(id, new Date(startAt), new Date(endAt), updatedByUuid);
    return NextResponse.json(updated);
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("[API_CALENDAR_RESCHEDULE_POST_ERROR]", error);
    return NextResponse.json({ message: error.message || "Internal Server Error" }, { status: 500 });
  }
}
