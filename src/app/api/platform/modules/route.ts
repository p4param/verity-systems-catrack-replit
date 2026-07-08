import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/auth-guard";
import { PlatformModuleService } from "@/modules/platform/configuration/services/platform-module-service";
import { formatUserIdToUuid } from "@/lib/auth/uuid-helper";

const service = new PlatformModuleService();

export async function GET(req: Request) {
  try {
    const user = requirePermission(req, "PLATFORM_MODULE_VIEW");
    const list = await service.getAll();
    return NextResponse.json({ success: true, data: list });
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: { message: msg, code: "SERVER_ERROR" } }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = requirePermission(req, "PLATFORM_MODULE_CREATE");
    const body = await req.json();

    const { code, name, description, icon, sortOrder, isActive, isSystem, metadata } = body;
    if (!code || !name) {
      return NextResponse.json({ success: false, error: { message: "Code and name are required", code: "VALIDATION_ERROR" } }, { status: 400 });
    }

    const created = await service.create(
      {
        code: code.toUpperCase(),
        name,
        description: body.description,
        icon: body.icon,
        sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : 0,
        isActive: body.isActive !== false,
        isSystem: body.isSystem === true,
        metadata: body.metadata ?? {},
        navigationGroup: body.navigationGroup,
        displayOrder: body.displayOrder !== undefined ? Number(body.displayOrder) : 0,
        route: body.route,
        defaultPage: body.defaultPage,
        color: body.color,
        badge: body.badge,
        badgeColor: body.badgeColor,
        menuVisible: body.menuVisible !== false,
        showInSearch: body.showInSearch !== false,
        showOnDashboard: body.showOnDashboard !== false,
        showInMobile: body.showInMobile === true,
        isLicensed: body.isLicensed !== false,
        requiresLicense: body.requiresLicense === true,
        featureFlag: body.featureFlag ?? "Production",
        moduleDependencies: body.moduleDependencies ?? [],
        minimumRole: body.minimumRole ?? "USER",
        defaultPermissionSet: body.defaultPermissionSet ?? [],
        defaultLandingPage: body.defaultLandingPage,
        helpUrl: body.helpUrl,
        documentationUrl: body.documentationUrl,
        supportEmail: body.supportEmail,
        createdBy: formatUserIdToUuid(user.sub),
      },
      user.tenantId,
      user.sub
    );

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: { message: msg, code: "SERVER_ERROR" } }, { status: 500 });
  }
}
