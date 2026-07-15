import { prisma } from "@/lib/prisma";
import { EntityRepository } from "../repositories/entity-repository";

const reservedKeywords = ["system", "admin", "tenant", "user", "role", "metadata", "config"];

export class EntityValidationService {
  private repository: EntityRepository;

  constructor() {
    this.repository = new EntityRepository();
  }

  async validateForCreate(data: any) {
    if (!data.name || !data.code || !data.moduleId) {
      throw new Error("Name, Code, and Module ID are required.");
    }

    if (reservedKeywords.includes(data.code.toLowerCase())) {
      throw new Error(`The entity code '${data.code}' is a reserved keyword.`);
    }

    if (!/^[a-zA-Z0-9_]+$/.test(data.code)) {
      throw new Error("Entity code must be alphanumeric and contain no spaces.");
    }

    const codeExists = await this.repository.exists(data.code);
    if (codeExists) {
      throw new Error(`Entity with code '${data.code}' already exists.`);
    }

    if (data.apiName) {
      const apiNameExists = await this.repository.getByApiName(data.apiName);
      if (apiNameExists) {
        throw new Error(`Entity with API Name '${data.apiName}' already exists.`);
      }
    }

    const nameExists = await this.repository.getByNameInModule(data.moduleId, data.name);
    if (nameExists) {
      throw new Error(`Entity with name '${data.name}' already exists in this module.`);
    }
  }

  async validateForUpdate(id: string, data: any) {
    const existing = await this.repository.getById(id);
    if (!existing) {
      throw new Error("Entity not found.");
    }

    if (existing.metadataLocked) {
      throw new Error("This entity is metadata locked and cannot be edited.");
    }

    if (data.name && data.name !== existing.name) {
      const nameExists = await this.repository.getByNameInModule(existing.moduleId, data.name);
      if (nameExists) {
        throw new Error(`Entity with name '${data.name}' already exists in this module.`);
      }
    }

    if (data.apiName && data.apiName !== existing.apiName) {
      const apiNameExists = await this.repository.getByApiName(data.apiName);
      if (apiNameExists) {
        throw new Error(`Entity with API Name '${data.apiName}' already exists.`);
      }
    }
  }

  async validateForDelete(id: string) {
    const existing = await this.repository.getById(id);
    if (!existing) {
      throw new Error("Entity not found.");
    }

    if (existing.isSystem) {
      throw new Error("System entities cannot be deleted.");
    }

    if (existing.status === "PUBLISHED") {
      throw new Error("Published entities cannot be deleted. Archive them instead.");
    }

    if (existing.status !== "DRAFT") {
      throw new Error("Only Draft entities can be hard deleted.");
    }

    // Dependency validation
    const recordCount = await prisma.entityRecord.count({ where: { entityId: id } });
    if (recordCount > 0) {
      throw new Error(`Cannot delete entity. It has ${recordCount} runtime records associated with it.`);
    }

    const fieldCount = await prisma.entityFieldDefinition.count({ where: { entityId: id } });
    if (fieldCount > 0) {
      throw new Error(`Cannot delete entity. It has ${fieldCount} field definitions associated with it.`);
    }
  }

  async validateForArchive(id: string) {
    const existing = await this.repository.getById(id);
    if (!existing) {
      throw new Error("Entity not found.");
    }

    if (existing.isSystem) {
      throw new Error("System entities cannot be archived.");
    }
  }
}

