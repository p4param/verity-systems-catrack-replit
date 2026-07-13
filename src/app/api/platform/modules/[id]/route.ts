import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/auth-guard";
import { PlatformModuleService } from "@/modules/platform/configuration/services/platform-module-service";
import { formatUserIdToUuid } from "@/lib/auth/uuid-helper";

const service = new PlatformModuleService();

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requirePermission(req, "PLATFORM_MODULE_VIEW");
    const { id } = await params;

    const platformModule = await service.getById(id);
    if (!platformModule) {
      return NextResponse.json({ success: false, error: { message: "Module not found", code: "NOT_FOUND" } }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: platformModule });
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: { message: msg, code: "SERVER_ERROR" } }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requirePermission(req, "PLATFORM_MODULE_UPDATE");
    const { id } = await params;
    const body = await req.json();

    const updated = await service.update(
      id,
      {
        name: body.name,
        description: body.description,
        icon: body.icon,
        sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : undefined,
        isActive: body.isActive,
        isSystem: body.isSystem,
        metadata: body.metadata,
        navigationGroup: body.navigationGroup,
        displayOrder: body.displayOrder !== undefined ? Number(body.displayOrder) : undefined,
        route: body.route,
        defaultPage: body.defaultPage,
        color: body.color,
        badge: body.badge,
        badgeColor: body.badgeColor,
        menuVisible: body.menuVisible,
        showInSearch: body.showInSearch,
        showOnDashboard: body.showOnDashboard,
        showInMobile: body.showInMobile,
        isLicensed: body.isLicensed,
        requiresLicense: body.requiresLicense,
        featureFlag: body.featureFlag,
        moduleDependencies: body.moduleDependencies,
        minimumRole: body.minimumRole,
        defaultPermissionSet: body.defaultPermissionSet,
        defaultLandingPage: body.defaultLandingPage,
        helpUrl: body.helpUrl,
        documentationUrl: body.documentationUrl,
        supportEmail: body.supportEmail,
        updatedBy: formatUserIdToUuid(user.sub),
      },
      user.tenantId,
      user.sub
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: { message: msg, code: "SERVER_ERROR" } }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requirePermission(req, "PLATFORM_MODULE_DELETE");
    const { id } = await params;

    const deleted = await service.delete(id, user.tenantId, user.sub);
    return NextResponse.json({ success: true, data: deleted });
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: { message: msg, code: "SERVER_ERROR" } }, { status: 500 });
  }
}
