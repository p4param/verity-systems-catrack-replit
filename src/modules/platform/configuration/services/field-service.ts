import { FieldRepository } from "../repositories/field-repository";
import { CreateFieldDto, UpdateFieldDto, createFieldDtoSchema, updateFieldDtoSchema } from "../validations/field-validation";
import { createAuditLog } from "@/lib/audit";
import { formatUserIdToUuid } from "@/lib/auth/uuid-helper";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export class FieldService {
  private repository: FieldRepository;

  constructor() {
    this.repository = new FieldRepository();
  }

  async getAllByEntityId(entityId: string) {
    return this.repository.getAllByEntityId(entityId);
  }

  async getById(id: string) {
    return this.repository.getById(id);
  }

  async createField(entityId: string, data: CreateFieldDto, tenantId: number, actorUserId: number) {
    logger.info(`Initiating field creation: ${data.code} for entity ${entityId}`, { tenantId, userId: actorUserId, module: "FieldService" });
    
    // Validate payload
    const validatedData = createFieldDtoSchema.parse(data);
    const formattedCreatedBy = formatUserIdToUuid(actorUserId);

    try {
      return await prisma.$transaction(async (tx) => {
        // Uniqueness check
        const exists = await this.repository.getByCode(entityId, validatedData.code, tx);
        if (exists) {
          throw new Error(`Field with code ${validatedData.code} already exists on this entity.`);
        }

        const metadata = {
          ...(validatedData.metadata || {}),
          validationProfile: validatedData.validationProfile,
          formatter: validatedData.formatter,
          behavior: validatedData.behavior
        };

        const field = await this.repository.create({
          entityId,
          code: validatedData.code,
          label: validatedData.label,
          dataType: validatedData.dataType,
          uiControl: validatedData.uiControl,
          required: validatedData.required,
          unique: validatedData.unique,
          searchable: validatedData.searchable,
          sortable: validatedData.sortable,
          filterable: validatedData.filterable,
          defaultValue: validatedData.defaultValue,
          dataSource: validatedData.dataSource,
          lookupDefinition: validatedData.lookupDefinition,
          displayOrder: validatedData.displayOrder,
          metadata: metadata,
          options: validatedData.options,
          createdBy: formattedCreatedBy
        }, tx);

        await createAuditLog({
          tenantId,
          actorUserId,
          action: "FIELD_CREATED",
          details: `Created Field: ${field.code} on Entity: ${entityId}`
        }, tx);

        logger.info(`Successfully created field ${field.code}`, { tenantId, fieldId: field.id, module: "FieldService" });
        return field;
      });
    } catch (error: any) {
      logger.error(`Field creation failed for ${data.code}`, { error: error.message, tenantId, module: "FieldService" });
      throw error;
    }
  }

  async updateField(id: string, data: UpdateFieldDto, tenantId: number, actorUserId: number) {
    logger.info(`Initiating field update: ${id}`, { tenantId, userId: actorUserId, module: "FieldService" });
    
    const validatedData = updateFieldDtoSchema.parse(data);
    const formattedUpdatedBy = formatUserIdToUuid(actorUserId);

    try {
      return await prisma.$transaction(async (tx) => {
        const existing = await this.repository.getById(id, tx);
        if (!existing) throw new Error(`Field not found: ${id}`);

        const metadata = {
          ...(existing.metadata as object || {}),
          ...(validatedData.metadata || {}),
          ...(validatedData.validationProfile !== undefined && { validationProfile: validatedData.validationProfile }),
          ...(validatedData.formatter !== undefined && { formatter: validatedData.formatter }),
          ...(validatedData.behavior !== undefined && { behavior: validatedData.behavior })
        };
        
        // Remove virtual fields from restData before update
        const { validationProfile, formatter, behavior, ...restData } = validatedData;

        const updated = await this.repository.update(id, {
          ...restData,
          metadata: metadata,
          updatedBy: formattedUpdatedBy
        }, tx);

        await createAuditLog({
          tenantId,
          actorUserId,
          action: "FIELD_UPDATED",
          details: `Updated Field: ${updated.code} on Entity: ${existing.entityId}`
        }, tx);

        logger.info(`Successfully updated field ${id}`, { tenantId, module: "FieldService" });
        return updated;
      });
    } catch (error: any) {
      logger.error(`Field update failed for ${id}`, { error: error.message, tenantId, module: "FieldService" });
      throw error;
    }
  }

  async deleteField(id: string, tenantId: number, actorUserId: number) {
    logger.info(`Initiating field deletion: ${id}`, { tenantId, userId: actorUserId, module: "FieldService" });

    try {
      return await prisma.$transaction(async (tx) => {
        const existing = await this.repository.getById(id, tx);
        if (!existing) throw new Error(`Field not found: ${id}`);

        const deleted = await this.repository.delete(id, tx);

        await createAuditLog({
          tenantId,
          actorUserId,
          action: "FIELD_DELETED",
          details: `Deleted Field: ${existing.code} on Entity: ${existing.entityId}`
        }, tx);

        logger.info(`Successfully deleted field ${id}`, { tenantId, module: "FieldService" });
        return deleted;
      });
    } catch (error: any) {
      logger.error(`Field deletion failed for ${id}`, { error: error.message, tenantId, module: "FieldService" });
      throw error;
    }
  }
}
