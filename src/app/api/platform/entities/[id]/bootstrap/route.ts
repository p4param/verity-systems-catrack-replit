import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/auth-guard";
import { EntityService } from "@/modules/platform/configuration/services/entity-service";

const service = new EntityService();

export async function POST(req: Request, props: any) {
  try {
    const user = requirePermission(req, "PLATFORM_ENTITY_EDIT");
    const params = await props.params;
    const { id } = params;

    const result = await service.bootstrap(id, user.tenantId, user.sub);
    return NextResponse.json({ success: true, data: result });
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: { message: msg, code: "SERVER_ERROR" } }, { status: 500 });
  }
}
