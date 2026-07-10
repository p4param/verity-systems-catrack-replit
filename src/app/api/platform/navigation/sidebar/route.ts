import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/auth-guard";
import { NavigationService } from "@/modules/platform/navigation/services/navigation-service";

const service = new NavigationService();

export async function GET(req: Request) {
  try {
    // Requires standard authentication session
    const user = requirePermission(req, "PLATFORM_MODULE_VIEW");
    
    // Fetch user permissions and roles
    const userPermissions = user.permissions || [];
    const userRole = (user.roles && user.roles.length > 0) ? user.roles[0] : "USER";

    const sidebar = await service.generateSidebar(userPermissions, userRole);
    return NextResponse.json({ success: true, data: sidebar });
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: { message: msg } }, { status: 500 });
  }
}
