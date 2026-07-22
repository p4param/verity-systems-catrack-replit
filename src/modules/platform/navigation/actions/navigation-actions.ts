"use server";

import { NavigationService } from "../services/navigation-service";
import { NavigationRepository } from "../repositories/navigation-repository";

const service = new NavigationService();
const repository = new NavigationRepository();

function sanitizeUuid(id?: string): string {
  return (id && typeof id === "string" && id.trim().length > 0)
    ? id.trim()
    : "00000000-0000-0000-0000-000000000000";
}

export async function getNavigationDesignerTree() {
  try {
    return await service.generateTree();
  } catch (err: any) {
    console.error("[getNavigationDesignerTree_ERROR]", err);
    return [];
  }
}

export async function getNavigationProfiles() {
  try {
    return await repository.getProfiles();
  } catch (err: any) {
    console.error("[getNavigationProfiles_ERROR]", err);
    return [];
  }
}

export async function saveNavigationGroup(data: any, tenantId: string, actorUserId: string) {
  try {
    const validTenant = sanitizeUuid(tenantId);
    const validActor = sanitizeUuid(actorUserId);
    
    const code = (data.code || data.name || "").trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
    const payload = {
      ...data,
      code: code || `GROUP_${Date.now()}`
    };

    return await service.createGroup(payload, validTenant, validActor);
  } catch (err: any) {
    console.error("[saveNavigationGroup_ERROR]", err);
    throw new Error(err.message || "Failed to create navigation group");
  }
}

export async function updateNavigationGroup(id: string, data: any, tenantId: string, actorUserId: string) {
  try {
    const validTenant = sanitizeUuid(tenantId);
    const validActor = sanitizeUuid(actorUserId);
    return await service.updateGroup(id, data, validTenant, validActor);
  } catch (err: any) {
    console.error("[updateNavigationGroup_ERROR]", err);
    throw new Error(err.message || "Failed to update navigation group");
  }
}

export async function deleteNavigationGroup(id: string, tenantId: string, actorUserId: string) {
  try {
    const validTenant = sanitizeUuid(tenantId);
    const validActor = sanitizeUuid(actorUserId);
    return await service.deleteGroup(id, validTenant, validActor);
  } catch (err: any) {
    console.error("[deleteNavigationGroup_ERROR]", err);
    throw new Error(err.message || "Failed to delete navigation group");
  }
}

export async function saveNavigationItem(data: any, tenantId: string, actorUserId: string) {
  try {
    const validTenant = sanitizeUuid(tenantId);
    const validActor = sanitizeUuid(actorUserId);
    return await service.createItem(data, validTenant, validActor);
  } catch (err: any) {
    console.error("[saveNavigationItem_ERROR]", err);
    throw new Error(err.message || "Failed to create navigation item");
  }
}

export async function updateNavigationItem(id: string, data: any, tenantId: string, actorUserId: string) {
  try {
    const validTenant = sanitizeUuid(tenantId);
    const validActor = sanitizeUuid(actorUserId);
    return await service.updateItem(id, data, validTenant, validActor);
  } catch (err: any) {
    console.error("[updateNavigationItem_ERROR]", err);
    throw new Error(err.message || "Failed to update navigation item");
  }
}

export async function deleteNavigationItem(id: string, tenantId: string, actorUserId: string) {
  try {
    const validTenant = sanitizeUuid(tenantId);
    const validActor = sanitizeUuid(actorUserId);
    return await service.deleteItem(id, validTenant, validActor);
  } catch (err: any) {
    console.error("[deleteNavigationItem_ERROR]", err);
    throw new Error(err.message || "Failed to delete navigation item");
  }
}

export async function moveNavigation(itemId: string, parentId: string | null, order: number, tenantId: string, actorUserId: string) {
  try {
    const validTenant = sanitizeUuid(tenantId);
    const validActor = sanitizeUuid(actorUserId);
    return await service.moveItem(itemId, parentId, order, validTenant, validActor);
  } catch (err: any) {
    console.error("[moveNavigation_ERROR]", err);
    throw new Error(err.message || "Failed to move navigation item");
  }
}

export async function publishNavigation(profileId: string, tenantId: string, actorUserId: string) {
  try {
    const validTenant = sanitizeUuid(tenantId);
    const validActor = sanitizeUuid(actorUserId);
    return await service.publishNavigation(profileId, validActor, validTenant);
  } catch (err: any) {
    console.error("[publishNavigation_ERROR]", err);
    throw new Error(err.message || "Failed to publish navigation");
  }
}

export async function restoreNavigationVersion(versionId: string, tenantId: string, actorUserId: string) {
  try {
    const validTenant = sanitizeUuid(tenantId);
    const validActor = sanitizeUuid(actorUserId);
    return await service.restoreVersion(versionId, validActor, validTenant);
  } catch (err: any) {
    console.error("[restoreNavigationVersion_ERROR]", err);
    throw new Error(err.message || "Failed to restore navigation version");
  }
}

export async function getVersionsList() {
  try {
    return await service.getVersionsList();
  } catch (err: any) {
    console.error("[getVersionsList_ERROR]", err);
    return [];
  }
}

export async function getHistoryLogs() {
  try {
    return await repository.getHistoryLogs();
  } catch (err: any) {
    console.error("[getHistoryLogs_ERROR]", err);
    return [];
  }
}

