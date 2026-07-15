import { LayoutRepository } from "../repositories/layout-repository";
import {
  CreateLayoutDto,
  UpdateLayoutDto,
  createLayoutDtoSchema,
  updateLayoutDtoSchema,
  LayoutRootSchema,
} from "../validations/layout-validation";
import { createAuditLog } from "@/lib/audit";
import { formatUserIdToUuid } from "@/lib/auth/uuid-helper";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export class LayoutService {
  private repository: LayoutRepository;

  constructor() {
    this.repository = new LayoutRepository();
  }

  async getAllByEntityId(entityId: string) {
    return this.repository.getAllByEntityId(entityId);
  }

  async getById(id: string) {
    return this.repository.getById(id);
  }

  async createLayout(entityId: string, data: CreateLayoutDto, tenantId: string, actorUserId: string) {
    logger.info(`Initiating layout creation for entity: ${entityId}`, {
      tenantId,
      userId: actorUserId,
      module: "LayoutService",
    });

    const validatedData = createLayoutDtoSchema.parse(data);
    const formattedCreatedBy = actorUserId;

    // Validate the layout JSON structure
    if (validatedData.layout) {
      LayoutRootSchema.parse(validatedData.layout);
    }

    try {
      return await prisma.$transaction(async (tx) => {
        // Uniqueness check
        const exists = await this.repository.getByCode(entityId, validatedData.code, tx);
        if (exists) {
          throw new Error(`Layout with code ${validatedData.code} already exists on this entity.`);
        }

        // Handle default layout exclusivity (scoped by layoutType)
        if (validatedData.isDefault) {
          await this.repository.unsetDefaultForEntity(entityId, validatedData.layoutType, tx);
        }

        const layout = await this.repository.create(
          {
            entityId,
            code: validatedData.code,
            name: validatedData.name,
            description: validatedData.description,
            layoutType: validatedData.layoutType,
            isDefault: validatedData.isDefault,
            layout: validatedData.layout || {},
            createdBy: formattedCreatedBy,
          },
          tx
        );

        await createAuditLog(
          {
            tenantId,
            actorUserId,
            action: "LAYOUT_CREATED",
            details: `Created Layout: ${layout.code} (${layout.layoutType}) on Entity: ${entityId}`,
          },
          tx
        );

        logger.info(`Successfully created layout ${layout.code}`, {
          tenantId,
          layoutId: layout.id,
          module: "LayoutService",
        });
        return layout;
      });
    } catch (error: any) {
      logger.error(`Layout creation failed for ${data.code}`, {
        error: error.message,
        tenantId,
        module: "LayoutService",
      });
      throw error;
    }
  }

  async updateLayout(id: string, data: UpdateLayoutDto, tenantId: string, actorUserId: string) {
    logger.info(`Initiating layout update: ${id}`, {
      tenantId,
      userId: actorUserId,
      module: "LayoutService",
    });

    const validatedData = updateLayoutDtoSchema.parse(data);
    const formattedUpdatedBy = actorUserId;

    // Validate the layout JSON structure if provided
    if (validatedData.layout) {
      LayoutRootSchema.parse(validatedData.layout);
    }

    try {
      return await prisma.$transaction(async (tx) => {
        const existing = await this.repository.getById(id, tx);
        if (!existing) throw new Error(`Layout not found: ${id}`);

        // Handle default layout exclusivity
        if (validatedData.isDefault) {
          await this.repository.unsetDefaultForEntity(
            existing.entityId,
            validatedData.layoutType || existing.layoutType,
            tx
          );
        }

        const updated = await this.repository.update(
          id,
          {
            ...validatedData,
            layout: validatedData.layout || existing.layout,
            updatedBy: formattedUpdatedBy,
          },
          tx
        );

        await createAuditLog(
          {
            tenantId,
            actorUserId,
            action: "LAYOUT_UPDATED",
            details: `Updated Layout: ${updated.code} on Entity: ${existing.entityId}`,
          },
          tx
        );

        logger.info(`Successfully updated layout ${id}`, {
          tenantId,
          module: "LayoutService",
        });
        return updated;
      });
    } catch (error: any) {
      logger.error(`Layout update failed for ${id}`, {
        error: error.message,
        tenantId,
        module: "LayoutService",
      });
      throw error;
    }
  }

  async deleteLayout(id: string, tenantId: string, actorUserId: string) {
    logger.info(`Initiating layout deletion: ${id}`, {
      tenantId,
      userId: actorUserId,
      module: "LayoutService",
    });

    try {
      return await prisma.$transaction(async (tx) => {
        const existing = await this.repository.getById(id, tx);
        if (!existing) throw new Error(`Layout not found: ${id}`);

        const deleted = await this.repository.delete(id, tx);

        await createAuditLog(
          {
            tenantId,
            actorUserId,
            action: "LAYOUT_DELETED",
            details: `Deleted Layout: ${existing.code} on Entity: ${existing.entityId}`,
          },
          tx
        );

        logger.info(`Successfully deleted layout ${id}`, {
          tenantId,
          module: "LayoutService",
        });
        return deleted;
      });
    } catch (error: any) {
      logger.error(`Layout deletion failed for ${id}`, {
        error: error.message,
        tenantId,
        module: "LayoutService",
      });
      throw error;
    }
  }
}

export const layoutService = new LayoutService();

