"use server";

import { PlatformModuleService } from "../services/platform-module-service";
import { formatUserIdToUuid } from "@/lib/auth/uuid-helper";

const service = new PlatformModuleService();

export async function createPlatformModule(data: any, tenantId: string, actorUserId: string) {
  return service.create(data, tenantId, actorUserId);
}

export async function updatePlatformModule(id: string, data: any, tenantId: string, actorUserId: string) {
  return service.update(id, data, tenantId, actorUserId);
}

export async function deletePlatformModule(id: string, tenantId: string, actorUserId: string) {
  return service.delete(id, tenantId, actorUserId);
}

export async function togglePlatformModule(id: string, tenantId: string, actorUserId: string) {
  return service.toggleActive(id, tenantId, actorUserId);
}

export async function toggleModule(id: string, tenantId: string, actorUserId: string) {
  return service.toggleActive(id, tenantId, actorUserId);
}

export async function reorderModules(orderedIds: string[], tenantId: string, actorUserId: string) {
  return service.reorder(orderedIds, tenantId, actorUserId);
}

export async function refreshRuntime() {
  try {
    const { revalidateTag } = require("next/cache");
    revalidateTag("navigation");
  } catch {}
  return { success: true };
}

export async function clonePlatformModule(id: string, newCode: string, tenantId: string, actorUserId: string) {
  return service.cloneModule(id, newCode, tenantId, actorUserId);
}

export async function publishPlatformRuntime(tenantId: string, actorUserId: string) {
  return service.publishRuntime(tenantId, actorUserId);
}

export async function importPlatformModules(modulesList: any[], tenantId: string, actorUserId: string) {
  const userSub = formatUserIdToUuid(actorUserId);
  const results = [];
  for (const data of modulesList) {
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
        updatedBy: userSub
      }, tenantId, actorUserId);
      results.push(res);
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
        createdBy: userSub
      }, tenantId, actorUserId);
      results.push(res);
    }
  }
  return results;
}
