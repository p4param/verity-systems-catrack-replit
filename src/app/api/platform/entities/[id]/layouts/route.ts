import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/auth-guard";
import { LayoutService } from "@/modules/platform/configuration/services/layout-service";

const service = new LayoutService();

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requirePermission(req, "PLATFORM_VIEW_VIEW");
    const id = (await params).id;
    const list = await service.getAllByEntityId(id);
    return NextResponse.json({ success: true, data: list });
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: { message: msg, code: "SERVER_ERROR" } }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requirePermission(req, "PLATFORM_VIEW_CREATE");
    const body = await req.json();
    const id = (await params).id;

    const created = await service.createLayout(id, body, user.tenantId, user.sub);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
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

