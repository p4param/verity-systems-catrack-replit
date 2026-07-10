import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/auth-guard";
import { ViewService } from "@/modules/platform/configuration/services/view-service";

const service = new ViewService();

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; viewId: string }> }
) {
  try {
    const user = requirePermission(req, "PLATFORM_VIEW_EDIT");
    const body = await req.json();
    const viewId = (await params).viewId;

    const updated = await service.updateView(viewId, body, user.tenantId, user.sub);
    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: { message: msg, code: "SERVER_ERROR" } }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; viewId: string }> }
) {
  try {
    const user = requirePermission(req, "PLATFORM_VIEW_DELETE");
    const viewId = (await params).viewId;

    const deleted = await service.deleteView(viewId, user.tenantId, user.sub);
    return NextResponse.json({ success: true, data: deleted });
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: { message: msg, code: "SERVER_ERROR" } }, { status: 500 });
  }
}
