"use server";

import { NavigationService } from "../services/navigation-service";
import { NavigationRepository } from "../repositories/navigation-repository";

const service = new NavigationService();
const repository = new NavigationRepository();

export async function getNavigationDesignerTree() {
  return service.generateTree();
}

export async function getNavigationProfiles() {
  return repository.getProfiles();
}

export async function saveNavigationGroup(data: any, tenantId: string, actorUserId: string) {
  return service.createGroup(data, tenantId, actorUserId);
}

export async function updateNavigationGroup(id: string, data: any, tenantId: string, actorUserId: string) {
  return service.updateGroup(id, data, tenantId, actorUserId);
}

export async function deleteNavigationGroup(id: string, tenantId: string, actorUserId: string) {
  return service.deleteGroup(id, tenantId, actorUserId);
}

export async function saveNavigationItem(data: any, tenantId: string, actorUserId: string) {
  return service.createItem(data, tenantId, actorUserId);
}

export async function updateNavigationItem(id: string, data: any, tenantId: string, actorUserId: string) {
  return service.updateItem(id, data, tenantId, actorUserId);
}

export async function deleteNavigationItem(id: string, tenantId: string, actorUserId: string) {
  return service.deleteItem(id, tenantId, actorUserId);
}

export async function moveNavigation(itemId: string, parentId: string | null, order: number, tenantId: string, actorUserId: string) {
  return service.moveItem(itemId, parentId, order, tenantId, actorUserId);
}

export async function publishNavigation(profileId: string, tenantId: string, actorUserId: string) {
  return service.publishNavigation(profileId, actorUserId, tenantId);
}

export async function restoreNavigationVersion(versionId: string, tenantId: string, actorUserId: string) {
  return service.restoreVersion(versionId, actorUserId, tenantId);
}

export async function getVersionsList() {
  return service.getVersionsList();
}

export async function getHistoryLogs() {
  return repository.getHistoryLogs();
}
