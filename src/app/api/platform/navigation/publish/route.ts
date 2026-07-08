import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/auth-guard";
import { NavigationService } from "@/modules/platform/navigation/services/navigation-service";

const service = new NavigationService();

export async function POST(req: Request) {
  try {
    const user = requirePermission(req, "PLATFORM_MODULE_UPDATE");
    const { profileId } = await req.json();

    if (!profileId) {
      return NextResponse.json({ success: false, error: { message: "profileId is required" } }, { status: 400 });
    }

    const result = await service.publishNavigation(profileId, user.sub, user.tenantId);
    return NextResponse.json({ success: true, data: result });
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: { message: msg } }, { status: 500 });
  }
}
