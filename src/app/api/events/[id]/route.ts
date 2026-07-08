import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/auth-guard";
import { EventService } from "@/modules/events/services/event-service";
import { UpdateEventSchema } from "@/modules/events/validations";

const service = new EventService();

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    requirePermission(req, "INVENTORY_VIEW");
    const event = await service.getEventById(id);
    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }
    return NextResponse.json(event);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[API_EVENT_GET_BY_ID_ERROR]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = requirePermission(req, "INVENTORY_MANAGE");
    const updatedByUuid = "00000000-0000-0000-0000-" + user.sub.toString().padStart(12, "0");

    const body = await req.json();
    const validated = UpdateEventSchema.parse(body);

    const updated = await service.updateEvent(id, body.version, {
      ...validated,
      updatedBy: updatedByUuid,
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("[API_EVENT_PUT_ERROR]", error);
    return NextResponse.json(
      { message: error.message || "Bad Request" },
      { status: error.name === "ZodError" ? 400 : 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = requirePermission(req, "INVENTORY_MANAGE");
    const deletedByUuid = "00000000-0000-0000-0000-" + user.sub.toString().padStart(12, "0");

    await service.deleteEvent(id, deletedByUuid);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[API_EVENT_DELETE_ERROR]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
