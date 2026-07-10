import { EntityRepository } from "../repositories/entity-repository";

export class EntityDuplicateService {
  private repository: EntityRepository;

  constructor() {
    this.repository = new EntityRepository();
  }

  async duplicate(id: string, createdBy: string) {
    const existing = await this.repository.getById(id, false);
    if (!existing) throw new Error("Entity not found.");

    const newCode = existing.code + "_COPY";
    const newName = existing.name + " (Copy)";
    
    // Ensure unique name/code
    const codeExists = await this.repository.exists(newCode);
    if (codeExists) {
        throw new Error("A copy already exists. Please rename the existing copy first before duplicating again.");
    }
    
    const duplicateData = {
        moduleId: existing.moduleId,
        code: newCode,
        name: newName,
        pluralName: existing.pluralName + " (Copy)",
        description: existing.description || undefined,
        
        allowCRUD: existing.allowCRUD,
        allowImport: existing.allowImport,
        allowExport: existing.allowExport,
        allowWorkflow: existing.allowWorkflow,
        allowAttachments: existing.allowAttachments,
        allowAudit: existing.allowAudit,
        allowComments: existing.allowComments,
        allowTags: existing.allowTags,
        allowHierarchy: existing.allowHierarchy,
        allowSoftDelete: existing.allowSoftDelete,
        
        status: "DRAFT", // Copies always start as DRAFT
        version: 1,
        isActive: existing.isActive,
        isSystem: false, // Copies are never system
        isCustom: true,
        metadataLocked: false,
        
        showInNavigation: existing.showInNavigation,
        menuGroup: existing.menuGroup || undefined,
        menuOrder: existing.menuOrder,
        icon: existing.icon || undefined,
        route: existing.route ? existing.route + "-copy" : undefined,
        
        apiEnabled: existing.apiEnabled,
        apiName: existing.apiName ? existing.apiName + "-copy" : undefined,
        
        metadata: existing.metadata,
        createdBy
    };

    return this.repository.create(duplicateData);
  }
}
