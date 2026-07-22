import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/auth-guard";
import { LayoutService } from "@/modules/platform/configuration/services/layout-service";

const service = new LayoutService();

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; layoutId: string }> }
) {
  try {
    requirePermission(req, "PLATFORM_VIEW_VIEW");
    const { layoutId } = await params;
    const layout = await service.getById(layoutId);
    if (!layout) {
      return NextResponse.json({ success: false, error: { message: "Layout not found", code: "NOT_FOUND" } }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: layout });
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: { message: msg, code: "SERVER_ERROR" } }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; layoutId: string }> }
) {
  try {
    const user = requirePermission(req, "PLATFORM_VIEW_EDIT");
    const body = await req.json();
    const { layoutId } = await params;

    const updated = await service.updateLayout(layoutId, body, user.tenantId, user.sub);
    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    if (e instanceof Response) return e;
    let msg = e instanceof Error ? e.message : "Server error";
    if (typeof msg === "string" && msg.trim().startsWith("[") && msg.trim().endsWith("]")) {
      try {
        const parsed = JSON.parse(msg);
        if (Array.isArray(parsed)) {
          msg = parsed.map((item: any) => item.message || JSON.stringify(item)).join("; ");
        }
      } catch {}
    }
    return NextResponse.json({ success: false, error: { message: msg, code: "SERVER_ERROR" } }, { status: 500 });
  }
}


export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; layoutId: string }> }
) {
  try {
    const user = requirePermission(req, "PLATFORM_VIEW_DELETE");
    const { layoutId } = await params;

    const deleted = await service.deleteLayout(layoutId, user.tenantId, user.sub);
    return NextResponse.json({ success: true, data: deleted });
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: { message: msg, code: "SERVER_ERROR" } }, { status: 500 });
  }
}
