import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/auth-guard";
import { PlatformModuleService } from "@/modules/platform/configuration/services/platform-module-service";

const service = new PlatformModuleService();

export async function POST(req: Request) {
  try {
    const user = requirePermission(req, "PLATFORM_MODULE_UPDATE");
    const result = await service.publishRuntime(user.tenantId, user.sub);
    return NextResponse.json({ success: true, data: result });
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: { message: msg, code: "SERVER_ERROR" } }, { status: 500 });
  }
}
