import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/auth-guard";
import { EntityService } from "@/modules/platform/configuration/services/entity-service";

const service = new EntityService();

export async function GET(req: Request) {
  try {
    const user = requirePermission(req, "PLATFORM_ENTITY_VIEW");
    const list = await service.getAll(true);
    return NextResponse.json({ success: true, data: list });
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: { message: msg, code: "SERVER_ERROR" } }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = requirePermission(req, "PLATFORM_ENTITY_CREATE");
    const body = await req.json();

    const created = await service.create(body, user.tenantId, user.sub);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: { message: msg, code: "SERVER_ERROR" } }, { status: 500 });
  }
}
