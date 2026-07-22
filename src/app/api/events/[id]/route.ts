import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/auth-guard";
import { EventService } from "@/modules/events/services/event-service";
import { UpdateEventSchema } from "@/modules/events/validations";
import { toCanonicalUuid } from "@/lib/auth/identity-uuid";

const service = new EventService();

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = requirePermission(req, "INVENTORY_VIEW");
    const tenantUuid = toCanonicalUuid(user.tenantId);
    const event = await service.getEventById(id);
    if (!event || event.tenantId !== tenantUuid || event.isDeleted) {
      return NextResponse.json({ message: "Event not found or access denied" }, { status: 404 });
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
    const tenantUuid = toCanonicalUuid(user.tenantId);
    const updatedByUuid = toCanonicalUuid(user.sub);

    const existing = await service.getEventById(id);
    if (!existing || existing.tenantId !== tenantUuid || existing.isDeleted) {
      return NextResponse.json({ message: "Event not found or access denied" }, { status: 404 });
    }

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
    const tenantUuid = toCanonicalUuid(user.tenantId);
    const deletedByUuid = toCanonicalUuid(user.sub);

    const existing = await service.getEventById(id);
    if (!existing || existing.tenantId !== tenantUuid || existing.isDeleted) {
      return NextResponse.json({ message: "Event not found or access denied" }, { status: 404 });
    }

    await service.deleteEvent(id, deletedByUuid);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[API_EVENT_DELETE_ERROR]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
