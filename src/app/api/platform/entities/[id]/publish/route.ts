import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/auth-guard";
import { EntityService } from "@/modules/platform/configuration/services/entity-service";

const service = new EntityService();

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requirePermission(req, "PLATFORM_ENTITY_PUBLISH");
    const id = (await params).id;
    const result = await service.publish(id, user.tenantId, user.sub);
    return NextResponse.json({ success: true, data: result });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return NextResponse.json({ success: false, error: { message: e.message || "Server error", code: "SERVER_ERROR" } }, { status: 500 });
  }
}
