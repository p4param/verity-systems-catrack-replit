import { EntityRepository, CreateEntityDto, UpdateEntityDto } from "../repositories/entity-repository";
import { EntityValidationService } from "./entity-validation-service";
import { EntityDuplicateService } from "./entity-duplicate-service";
import { ValidationEngine } from "./validation/validation-engine";
import { createAuditLog } from "@/lib/audit";
import { formatUserIdToUuid } from "@/lib/auth/uuid-helper";
import { manifestGeneratorService } from "@/modules/platform/runtime/services/manifest-generator";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export class EntityService {
  private repository: EntityRepository;
  private validationService: EntityValidationService;
  private duplicateService: EntityDuplicateService;
  private validationEngine: ValidationEngine;

  constructor() {
    this.repository = new EntityRepository();
    this.validationService = new EntityValidationService();
    this.duplicateService = new EntityDuplicateService();
    this.validationEngine = new ValidationEngine();
  }

  async getAll(includeModule = true) {
    return this.repository.getAll(includeModule);
  }

  async getById(id: string, includeModule = true) {
    return this.repository.getById(id, includeModule);
  }

  /**
   * Creates a new Business Entity.
   * Executes within a transaction to guarantee Audit Log creation.
   */
  async create(data: CreateEntityDto, tenantId: number, actorUserId: number) {
    logger.info(`Initiating entity creation: ${data.code}`, { tenantId, userId: actorUserId, module: "EntityService" });
    await this.validationService.validateForCreate(data);
    
    const formattedCreatedBy = formatUserIdToUuid(actorUserId);
    const entityData = { ...data, createdBy: formattedCreatedBy };

    try {
      return await prisma.$transaction(async (tx) => {
        // Optional uniqueness check inside transaction to prevent P2002 race conditions
        const exists = await this.repository.exists(data.code, tx);
        if (exists) {
          throw new Error(`Entity with code ${data.code} already exists.`);
        }

        const entity = await this.repository.create(entityData, tx);
        
        await createAuditLog({
          tenantId,
          actorUserId,
          action: "ENTITY_CREATE",
          details: `Created Business Entity: ${entity.code} (${entity.name})`,
        }, tx);

        logger.info(`Entity created successfully: ${entity.id}`, { tenantId, userId: actorUserId, entity: entity.id });
        return entity;
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        logger.warn(`Concurrency collision during entity creation for code: ${data.code}`, { tenantId, userId: actorUserId });
        throw new Error(`Entity with code ${data.code} already exists.`);
      }
      logger.error(`Error during entity creation: ${error.message}`, error, { tenantId, userId: actorUserId });
      throw error;
    }
  }

  /**
   * Updates an existing Business Entity.
   * Executes within a transaction.
   */
  async update(id: string, data: UpdateEntityDto, tenantId: number, actorUserId: number) {
    logger.info(`Initiating entity update: ${id}`, { tenantId, userId: actorUserId, entity: id, module: "EntityService" });
    await this.validationService.validateForUpdate(id, data);
    
    const formattedUpdatedBy = formatUserIdToUuid(actorUserId);
    const updateData = { ...data, updatedBy: formattedUpdatedBy };

    return await prisma.$transaction(async (tx) => {
      const entity = await this.repository.update(id, updateData, tx);
      
      await createAuditLog({
        tenantId,
        actorUserId,
        action: "ENTITY_UPDATE",
        details: `Updated Business Entity: ${entity.code} (${entity.name})`,
      }, tx);

      logger.info(`Entity updated successfully: ${id}`, { tenantId, userId: actorUserId, entity: id });
      return entity;
    });
  }

  /**
   * Hard deletes a Business Entity.
   * Executes within a transaction.
   */
  async delete(id: string, tenantId: number, actorUserId: number) {
    logger.warn(`Initiating entity hard delete: ${id}`, { tenantId, userId: actorUserId, entity: id, module: "EntityService" });
    await this.validationService.validateForDelete(id);

    return await prisma.$transaction(async (tx) => {
      const existing = await this.repository.getById(id, false, tx);
      if (existing) {
          await this.repository.delete(id, tx);
          
          await createAuditLog({
            tenantId,
            actorUserId,
            action: "ENTITY_DELETE",
            details: `Hard Deleted Business Entity: ${existing.code} (${existing.name})`,
          }, tx);
      }
      logger.info(`Entity deleted successfully: ${id}`, { tenantId, userId: actorUserId, entity: id });
      return { success: true };
    });
  }

  /**
   * Soft deletes (archives) a Business Entity.
   * Executes within a transaction.
   */
  async archive(id: string, tenantId: number, actorUserId: number) {
    logger.info(`Initiating entity archive: ${id}`, { tenantId, userId: actorUserId, entity: id, module: "EntityService" });
    await this.validationService.validateForArchive(id);
    const formattedUpdatedBy = formatUserIdToUuid(actorUserId);
    
    return await prisma.$transaction(async (tx) => {
      const entity = await this.repository.updateStatus(id, "ARCHIVED", formattedUpdatedBy, tx); 
      
      await createAuditLog({
        tenantId,
        actorUserId,
        action: "ENTITY_ARCHIVE",
        details: `Archived Business Entity: ${entity.code} (${entity.name})`,
      }, tx);

      logger.info(`Entity archived successfully: ${id}`, { tenantId, userId: actorUserId, entity: id });
      return entity;
    });
  }

  /**
   * Restores an archived Business Entity to DRAFT status.
   * Executes within a transaction.
   */
  async restore(id: string, tenantId: number, actorUserId: number) {
    logger.info(`Initiating entity restore: ${id}`, { tenantId, userId: actorUserId, entity: id, module: "EntityService" });
    const formattedUpdatedBy = formatUserIdToUuid(actorUserId);

    return await prisma.$transaction(async (tx) => {
      const existing = await this.repository.getById(id, false, tx);
      if (!existing || existing.status !== "ARCHIVED") {
        throw new Error("Only archived entities can be restored.");
      }

      const entity = await this.repository.updateStatus(id, "DRAFT", formattedUpdatedBy, tx); 
      
      await createAuditLog({
        tenantId,
        actorUserId,
        action: "ENTITY_RESTORE",
        details: `Restored Business Entity to DRAFT: ${entity.code} (${entity.name})`,
      }, tx);

      logger.info(`Entity restored successfully: ${id}`, { tenantId, userId: actorUserId, entity: id });
      return entity;
    });
  }

  /**
   * Duplicates an existing Business Entity.
   */
  async duplicate(id: string, tenantId: number, actorUserId: number) {
    logger.info(`Initiating entity duplicate: ${id}`, { tenantId, userId: actorUserId, entity: id, module: "EntityService" });
    // Duplicate service manages its own transaction logic if any
    const formattedUser = formatUserIdToUuid(actorUserId);
    const entity = await this.duplicateService.duplicate(id, formattedUser);
    
    await createAuditLog({
      tenantId,
      actorUserId,
      action: "ENTITY_DUPLICATE",
      details: `Duplicated Business Entity from ${id} to ${entity.code}`,
    });

    logger.info(`Entity duplicated successfully: ${id} -> ${entity.id}`, { tenantId, userId: actorUserId, entity: entity.id });
    return entity;
  }

  async validatePublish(id: string) {
    const entity = await this.repository.getById(id, false);
    if (!entity) throw new Error("Entity not found.");
    return this.validationEngine.validateEntityForPublish(entity, prisma);
  }

  /**
   * Publishes an entity, synchronizes navigation, and registers search indices.
   * Executes within a robust transaction.
   */
  async publish(id: string, tenantId: number, actorUserId: number) {
    logger.info(`Initiating entity publish: ${id}`, { tenantId, userId: actorUserId, entity: id, module: "EntityService" });
    const entity = await this.repository.getById(id, false);
    if (!entity) throw new Error("Entity not found.");

    const validationResult = await this.validationEngine.validateEntityForPublish(entity, prisma);
    if (!validationResult.isValid) {
      logger.warn(`Entity publish validation failed: ${id}`, { tenantId, userId: actorUserId, entity: id });
      throw new Error("Validation failed. Cannot publish.");
    }

    const { publishService } = await import("./publish-service");
    const formattedUpdatedBy = formatUserIdToUuid(actorUserId);
    
    // Delegate to the formal transactional Publish Pipeline
    const result = await publishService.publishEntity(id, formattedUpdatedBy);
    
    await createAuditLog({
      tenantId,
      actorUserId,
      action: "ENTITY_PUBLISH",
      details: `Published Business Entity: ${entity.code} (${entity.name}) (Artifact v${result.artifactVersion})`,
    }, prisma);

    logger.info(`Entity published successfully: ${id}`, { tenantId, userId: actorUserId, entity: id });
    return { entity: { ...entity, status: "PUBLISHED" }, validationResult };
  }
}
