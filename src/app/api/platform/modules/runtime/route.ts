import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/auth-guard";
import { PlatformModuleService } from "@/modules/platform/configuration/services/platform-module-service";

const service = new PlatformModuleService();

export async function GET(req: Request) {
  try {
    const user = requirePermission(req, "PLATFORM_MODULE_VIEW");
    
    const allModules = await service.getAll();
    const validationResult = await service.validateDependencies();
    
    return NextResponse.json({
      success: true,
      data: {
        modules: allModules,
        validation: validationResult
      }
    });
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: { message: msg, code: "SERVER_ERROR" } }, { status: 500 });
  }
}
