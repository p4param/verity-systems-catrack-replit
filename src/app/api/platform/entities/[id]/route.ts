import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/auth-guard";
import { EntityService } from "@/modules/platform/configuration/services/entity-service";

const service = new EntityService();

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requirePermission(req, "PLATFORM_ENTITY_VIEW");
    const id = (await params).id;
    const entity = await service.getById(id, true);
    if (!entity) {
      return NextResponse.json({ success: false, error: { message: "Entity not found", code: "NOT_FOUND" } }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: entity });
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: { message: msg, code: "SERVER_ERROR" } }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requirePermission(req, "PLATFORM_ENTITY_EDIT");
    const body = await req.json();
    const id = (await params).id;

    const updated = await service.update(id, body, user.tenantId, user.sub);
    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: { message: msg, code: "SERVER_ERROR" } }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requirePermission(req, "PLATFORM_ENTITY_DELETE");
    const id = (await params).id;
    await service.delete(id, user.tenantId, user.sub);
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: { message: msg, code: "SERVER_ERROR" } }, { status: 500 });
  }
}
