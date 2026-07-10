"use server";

import { EntityService } from "../services/entity-service";

const service = new EntityService();

function invalidateCache() {
  try {
    const { revalidateTag } = require("next/cache");
    revalidateTag("entities");
  } catch {}
}

export async function createEntity(data: any, tenantId: number, actorUserId: number) {
  try {
    const result = await service.create(data, tenantId, actorUserId);
    invalidateCache();
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateEntity(id: string, data: any, tenantId: number, actorUserId: number) {
  try {
    const result = await service.update(id, data, tenantId, actorUserId);
    invalidateCache();
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteEntity(id: string, tenantId: number, actorUserId: number) {
  try {
    const result = await service.delete(id, tenantId, actorUserId);
    invalidateCache();
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function archiveEntity(id: string, tenantId: number, actorUserId: number) {
  try {
    const result = await service.archive(id, tenantId, actorUserId);
    invalidateCache();
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function restoreEntity(id: string, tenantId: number, actorUserId: number) {
  try {
    const result = await service.restore(id, tenantId, actorUserId);
    invalidateCache();
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function duplicateEntity(id: string, tenantId: number, actorUserId: number) {
  try {
    const result = await service.duplicate(id, tenantId, actorUserId);
    invalidateCache();
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
