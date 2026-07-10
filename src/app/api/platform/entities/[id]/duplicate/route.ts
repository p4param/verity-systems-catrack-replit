import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/auth-guard";
import { EntityService } from "@/modules/platform/configuration/services/entity-service";

const service = new EntityService();

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requirePermission(req, "PLATFORM_ENTITY_DUPLICATE");
    const id = (await params).id;
    const duplicated = await service.duplicate(id, user.tenantId, user.sub);
    return NextResponse.json({ success: true, data: duplicated });
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: { message: msg, code: "SERVER_ERROR" } }, { status: 500 });
  }
}
