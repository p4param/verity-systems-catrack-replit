import { ViewRepository } from "../repositories/view-repository";
import { CreateViewDto, UpdateViewDto, createViewDtoSchema, updateViewDtoSchema } from "../validations/view-validation";
import { createAuditLog } from "@/lib/audit";
import { formatUserIdToUuid } from "@/lib/auth/uuid-helper";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export class ViewService {
  private repository: ViewRepository;

  constructor() {
    this.repository = new ViewRepository();
  }

  async getAllByEntityId(entityId: string) {
    return this.repository.getAllByEntityId(entityId);
  }

  async getById(id: string) {
    return this.repository.getById(id);
  }

  async createView(entityId: string, data: CreateViewDto, tenantId: string, actorUserId: string) {
    logger.info(`Initiating view creation for entity: ${entityId}`, { tenantId, userId: actorUserId, module: "ViewService" });

    const validatedData = createViewDtoSchema.parse(data);
    const formattedCreatedBy = actorUserId;

    try {
      return await prisma.$transaction(async (tx) => {
        // Uniqueness check
        const exists = await this.repository.getByCode(entityId, validatedData.code, tx);
        if (exists) {
          throw new Error(`View with code ${validatedData.code} already exists on this entity.`);
        }

        // Handle default view exclusivity
        if (validatedData.isDefault) {
          await this.repository.unsetDefaultForEntity(entityId, tx);
        }

        if (validatedData.metadata) {
          const m = validatedData.metadata;
          const colFields = new Set<string>();
          const sortFields = new Set<string>();
          const searchFields = new Set<string>();
          const groupFields = new Set<string>();
          const displayOrders = new Set<number>();

          if (m.columns) {
            for (const col of m.columns) {
              if (colFields.has(col.field)) throw new Error(`Duplicate column field: ${col.field}`);
              colFields.add(col.field);
              if (displayOrders.has(col.displayOrder)) throw new Error(`Duplicate display order: ${col.displayOrder}`);
              displayOrders.add(col.displayOrder);
            }
          }
          if (m.sorting) {
            for (const sort of m.sorting) {
              if (sortFields.has(sort.field)) throw new Error(`Duplicate sort field: ${sort.field}`);
              sortFields.add(sort.field);
            }
          }
          if (m.defaultSearchFields) {
            for (const sf of m.defaultSearchFields) {
              if (searchFields.has(sf)) throw new Error(`Duplicate search field: ${sf}`);
              searchFields.add(sf);
            }
          }
          if (m.grouping) {
            for (const g of m.grouping) {
              if (groupFields.has(g.field)) throw new Error(`Duplicate grouping field: ${g.field}`);
              groupFields.add(g.field);
            }
          }
        }

        const view = await this.repository.create({
          entityId,
          code: validatedData.code,
          name: validatedData.name,
          viewType: validatedData.viewType,
          isDefault: validatedData.isDefault,
          metadata: validatedData.metadata || {},
          status: validatedData.status,
          createdBy: formattedCreatedBy
        }, tx);

        await createAuditLog({
          tenantId,
          actorUserId,
          action: "VIEW_CREATED",
          details: `Created View: ${view.code} on Entity: ${entityId}`
        }, tx);

        logger.info(`Successfully created view ${view.code}`, { tenantId, viewId: view.id, module: "ViewService" });
        return view;
      });
    } catch (error: any) {
      logger.error(`View creation failed for ${data.code}`, { error: error.message, tenantId, module: "ViewService" });
      throw error;
    }
  }

  async updateView(id: string, data: UpdateViewDto, tenantId: string, actorUserId: string) {
    logger.info(`Initiating view update: ${id}`, { tenantId, userId: actorUserId, module: "ViewService" });
    
    const validatedData = updateViewDtoSchema.parse(data);
    const formattedUpdatedBy = actorUserId;

    try {
      return await prisma.$transaction(async (tx) => {
        const existing = await this.repository.getById(id, tx);
        if (!existing) throw new Error(`View not found: ${id}`);

        // Handle default view exclusivity
        if (validatedData.isDefault) {
          await this.repository.unsetDefaultForEntity(existing.entityId, tx);
        }

        if (validatedData.metadata) {
          const m = validatedData.metadata;
          const colFields = new Set<string>();
          const sortFields = new Set<string>();
          const searchFields = new Set<string>();
          const groupFields = new Set<string>();
          const displayOrders = new Set<number>();

          if (m.columns) {
            for (const col of m.columns) {
              if (colFields.has(col.field)) throw new Error(`Duplicate column field: ${col.field}`);
              colFields.add(col.field);
              if (displayOrders.has(col.displayOrder)) throw new Error(`Duplicate display order: ${col.displayOrder}`);
              displayOrders.add(col.displayOrder);
            }
          }
          if (m.sorting) {
            for (const sort of m.sorting) {
              if (sortFields.has(sort.field)) throw new Error(`Duplicate sort field: ${sort.field}`);
              sortFields.add(sort.field);
            }
          }
          if (m.defaultSearchFields) {
            for (const sf of m.defaultSearchFields) {
              if (searchFields.has(sf)) throw new Error(`Duplicate search field: ${sf}`);
              searchFields.add(sf);
            }
          }
          if (m.grouping) {
            for (const g of m.grouping) {
              if (groupFields.has(g.field)) throw new Error(`Duplicate grouping field: ${g.field}`);
              groupFields.add(g.field);
            }
          }
        }

        const updated = await this.repository.update(id, {
          ...validatedData,
          metadata: validatedData.metadata || existing.metadata,
          updatedBy: formattedUpdatedBy
        }, tx);

        await createAuditLog({
          tenantId,
          actorUserId,
          action: "VIEW_UPDATED",
          details: `Updated View: ${updated.code} on Entity: ${existing.entityId}`
        }, tx);

        logger.info(`Successfully updated view ${id}`, { tenantId, module: "ViewService" });
        return updated;
      });
    } catch (error: any) {
      logger.error(`View update failed for ${id}`, { error: error.message, tenantId, module: "ViewService" });
      throw error;
    }
  }

  async deleteView(id: string, tenantId: string, actorUserId: string) {
    logger.info(`Initiating view deletion: ${id}`, { tenantId, userId: actorUserId, module: "ViewService" });

    try {
      return await prisma.$transaction(async (tx) => {
        const existing = await this.repository.getById(id, tx);
        if (!existing) throw new Error(`View not found: ${id}`);

        const deleted = await this.repository.delete(id, tx);

        await createAuditLog({
          tenantId,
          actorUserId,
          action: "VIEW_DELETED",
          details: `Deleted View: ${existing.code} on Entity: ${existing.entityId}`
        }, tx);

        logger.info(`Successfully deleted view ${id}`, { tenantId, module: "ViewService" });
        return deleted;
      });
    } catch (error: any) {
      logger.error(`View deletion failed for ${id}`, { error: error.message, tenantId, module: "ViewService" });
      throw error;
    }
  }
}


