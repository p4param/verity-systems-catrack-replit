import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/client";

export interface CreateEntityDto {
  moduleId: string;
  code: string;
  name: string;
  pluralName: string;
  description?: string;
  
  allowCRUD?: boolean;
  allowImport?: boolean;
  allowExport?: boolean;
  allowWorkflow?: boolean;
  allowAttachments?: boolean;
  allowAudit?: boolean;
  allowComments?: boolean;
  allowTags?: boolean;
  allowHierarchy?: boolean;
  allowSoftDelete?: boolean;

  status?: string;
  version?: number;
  isActive?: boolean;
  isSystem?: boolean;
  isCustom?: boolean;
  metadataLocked?: boolean;

  showInNavigation?: boolean;
  menuGroup?: string;
  menuOrder?: number;
  icon?: string;
  route?: string;

  apiEnabled?: boolean;
  apiName?: string;
  
  metadata?: any;
  createdBy: string;
}

export interface UpdateEntityDto extends Partial<Omit<CreateEntityDto, "moduleId" | "code" | "createdBy">> {
  updatedBy: string;
}

export class EntityRepository {
  async getAll(includeModule = true, tx: any = prisma) {
    return tx.configurationEntity.findMany({
      include: includeModule ? { module: true } : undefined,
      orderBy: [{ menuOrder: "asc" }, { name: "asc" }],
    });
  }

  async getById(id: string, includeModule = true, tx: any = prisma) {
    return tx.configurationEntity.findUnique({
      where: { id },
      include: includeModule ? { module: true } : undefined,
    });
  }

  async getByCode(code: string, tx: any = prisma) {
    return tx.configurationEntity.findUnique({
      where: { code },
    });
  }

  async getByApiName(apiName: string, tx: any = prisma) {
    return tx.configurationEntity.findFirst({
      where: { apiName },
    });
  }
  
  async getByNameInModule(moduleId: string, name: string, tx: any = prisma) {
    return tx.configurationEntity.findFirst({
      where: { moduleId, name },
    });
  }

  async create(data: CreateEntityDto, tx: any = prisma) {
    return tx.configurationEntity.create({
      data: {
        moduleId: data.moduleId,
        code: data.code,
        name: data.name,
        pluralName: data.pluralName,
        description: data.description,
        
        allowCRUD: data.allowCRUD ?? true,
        allowImport: data.allowImport ?? false,
        allowExport: data.allowExport ?? false,
        allowWorkflow: data.allowWorkflow ?? false,
        allowAttachments: data.allowAttachments ?? false,
        allowAudit: data.allowAudit ?? true,
        allowComments: data.allowComments ?? false,
        allowTags: data.allowTags ?? false,
        allowHierarchy: data.allowHierarchy ?? false,
        allowSoftDelete: data.allowSoftDelete ?? true,

        status: data.status ?? "DRAFT",
        version: data.version ?? 1,
        isActive: data.isActive ?? true,
        isSystem: data.isSystem ?? false,
        isCustom: data.isCustom ?? true,
        metadataLocked: data.metadataLocked ?? false,

        showInNavigation: data.showInNavigation ?? false,
        menuGroup: data.menuGroup ?? null,
        menuOrder: data.menuOrder ?? 0,
        icon: data.icon ?? null,
        route: data.route ?? null,

        apiEnabled: data.apiEnabled ?? true,
        apiName: data.apiName ?? null,
        
        metadata: data.metadata ?? {},
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
      },
    });
  }

  async update(id: string, data: UpdateEntityDto, tx: any = prisma) {
    const updateData: any = { ...data };
    return tx.configurationEntity.update({
      where: { id },
      data: updateData,
    });
  }

  async updateStatus(id: string, status: string, updatedBy: string, tx: any = prisma) {
    return tx.configurationEntity.update({
      where: { id },
      data: { status, updatedBy },
    });
  }

  async delete(id: string, tx: any = prisma) {
    return tx.configurationEntity.delete({
      where: { id },
    });
  }

  async exists(code: string, tx: any = prisma): Promise<boolean> {
    const count = await tx.configurationEntity.count({
      where: { code },
    });
    return count > 0;
  }
}
