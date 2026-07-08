import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/auth-guard";
import { PlatformModuleService } from "@/modules/platform/configuration/services/platform-module-service";
import { formatUserIdToUuid } from "@/lib/auth/uuid-helper";

const service = new PlatformModuleService();

export async function POST(req: Request) {
  try {
    const user = requirePermission(req, "PLATFORM_MODULE_CREATE");
    const { modules } = await req.json();

    if (!Array.isArray(modules)) {
      return NextResponse.json({ success: false, error: { message: "modules list must be an array", code: "VALIDATION_ERROR" } }, { status: 400 });
    }

    const imported = [];
    for (const data of modules) {
      const existing = await service.getByCode(data.code);
      if (existing) {
        const res = await service.update(existing.id, {
          name: data.name,
          description: data.description,
          icon: data.icon,
          sortOrder: data.sortOrder,
          isActive: data.isActive,
          isSystem: data.isSystem,
          navigationGroup: data.navigationGroup,
          displayOrder: data.displayOrder,
          route: data.route,
          defaultPage: data.defaultPage,
          color: data.color,
          badge: data.badge,
          badgeColor: data.badgeColor,
          menuVisible: data.menuVisible,
          showInSearch: data.showInSearch,
          showOnDashboard: data.showOnDashboard,
          showInMobile: data.showInMobile,
          isLicensed: data.isLicensed,
          requiresLicense: data.requiresLicense,
          featureFlag: data.featureFlag,
          moduleDependencies: data.moduleDependencies,
          minimumRole: data.minimumRole,
          defaultPermissionSet: data.defaultPermissionSet,
          defaultLandingPage: data.defaultLandingPage,
          helpUrl: data.helpUrl,
          documentationUrl: data.documentationUrl,
          supportEmail: data.supportEmail,
          updatedBy: formatUserIdToUuid(user.sub)
        }, user.tenantId, user.sub);
        imported.push(res);
      } else {
        const res = await service.create({
          code: data.code,
          name: data.name,
          description: data.description || undefined,
          icon: data.icon || undefined,
          sortOrder: data.sortOrder,
          isActive: data.isActive,
          isSystem: data.isSystem,
          navigationGroup: data.navigationGroup || undefined,
          displayOrder: data.displayOrder,
          route: data.route || undefined,
          defaultPage: data.defaultPage || undefined,
          color: data.color || undefined,
          badge: data.badge || undefined,
          badgeColor: data.badgeColor || undefined,
          menuVisible: data.menuVisible,
          showInSearch: data.showInSearch,
          showOnDashboard: data.showOnDashboard,
          showInMobile: data.showInMobile,
          isLicensed: data.isLicensed,
          requiresLicense: data.requiresLicense,
          featureFlag: data.featureFlag,
          moduleDependencies: data.moduleDependencies,
          minimumRole: data.minimumRole || undefined,
          defaultPermissionSet: data.defaultPermissionSet,
          defaultLandingPage: data.defaultLandingPage || undefined,
          helpUrl: data.helpUrl || undefined,
          documentationUrl: data.documentationUrl || undefined,
          supportEmail: data.supportEmail || undefined,
          createdBy: formatUserIdToUuid(user.sub)
        }, user.tenantId, user.sub);
        imported.push(res);
      }
    }

    return NextResponse.json({ success: true, data: imported });
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: { message: msg, code: "SERVER_ERROR" } }, { status: 500 });
  }
}
