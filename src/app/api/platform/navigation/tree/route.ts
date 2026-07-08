import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/auth-guard";
import { NavigationService } from "@/modules/platform/navigation/services/navigation-service";

const service = new NavigationService();

export async function GET(req: Request) {
  try {
    requirePermission(req, "PLATFORM_MODULE_VIEW");
    const tree = await service.generateTree();
    return NextResponse.json({ success: true, data: tree });
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: { message: msg } }, { status: 500 });
  }
}
