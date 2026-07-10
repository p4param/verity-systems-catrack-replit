import { prisma } from "@/lib/prisma";

export interface CreateEntityFieldDto {
  entityId: string;
  code: string;
  label: string;
  dataType: string;
  required?: boolean;
  unique?: boolean;
  indexed?: boolean;
  searchable?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  defaultValue?: any;
  validation?: any;
  dataSource?: string;
  uiControl: string;
  lookupEntity?: string | null;
  displayOrder?: number;
  status?: string;
  metadata?: any;
  createdBy: string;
  options?: Array<{
    code: string;
    label: string;
    displayOrder?: number;
    color?: string | null;
    icon?: string | null;
    isDefault?: boolean;
  }>;
}

export interface UpdateEntityFieldDto extends Partial<Omit<CreateEntityFieldDto, "entityId" | "code" | "createdBy">> {
  updatedBy: string;
}

export class FieldRepository {
  async getAllByEntityId(entityId: string, tx: any = prisma) {
    return tx.entityFieldDefinition.findMany({
      where: { entityId },
      include: { options: { orderBy: { displayOrder: "asc" } } },
      orderBy: [{ displayOrder: "asc" }, { label: "asc" }],
    });
  }

  async getById(id: string, tx: any = prisma) {
    return tx.entityFieldDefinition.findUnique({
      where: { id },
      include: { options: { orderBy: { displayOrder: "asc" } } },
    });
  }

  async getByCode(entityId: string, code: string, tx: any = prisma) {
    return tx.entityFieldDefinition.findUnique({
      where: { entityId_code: { entityId, code } },
      include: { options: { orderBy: { displayOrder: "asc" } } },
    });
  }

  async create(data: CreateEntityFieldDto, tx: any = prisma) {
    const { options, ...restData } = data;
    return tx.entityFieldDefinition.create({
      data: {
        entityId: restData.entityId,
        code: restData.code,
        label: restData.label,
        dataType: restData.dataType,
        required: restData.required ?? false,
        unique: restData.unique ?? false,
        indexed: restData.indexed ?? false,
        searchable: restData.searchable ?? false,
        sortable: restData.sortable ?? false,
        filterable: restData.filterable ?? false,
        defaultValue: restData.defaultValue ? String(restData.defaultValue) : null,
        validation: restData.validation ?? {},
        dataSource: restData.dataSource ?? "STATIC",
        uiControl: restData.uiControl,
        lookupEntity: restData.lookupEntity,
        displayOrder: restData.displayOrder ?? 0,
        status: restData.status ?? "DRAFT",
        version: 1,
        metadata: restData.metadata ?? {},
        createdBy: restData.createdBy,
        updatedBy: restData.createdBy,
        options: options && options.length > 0 ? {
          create: options.map(opt => ({
            code: opt.code,
            label: opt.label,
            displayOrder: opt.displayOrder ?? 0,
            color: opt.color,
            icon: opt.icon,
            isDefault: opt.isDefault ?? false
          }))
        } : undefined
      },
      include: { options: true }
    });
  }

  async update(id: string, data: UpdateEntityFieldDto, tx: any = prisma) {
    const { updatedBy, options, ...rest } = data;
    
    return tx.entityFieldDefinition.update({
      where: { id },
      data: {
        ...rest,
        defaultValue: rest.defaultValue !== undefined ? String(rest.defaultValue) : undefined,
        version: { increment: 1 },
        updatedBy: updatedBy,
        ...(options !== undefined && {
          options: {
            deleteMany: {},
            create: options.map(opt => ({
              code: opt.code,
              label: opt.label,
              displayOrder: opt.displayOrder ?? 0,
              color: opt.color,
              icon: opt.icon,
              isDefault: opt.isDefault ?? false
            }))
          }
        })
      },
      include: { options: true }
    });
  }

  async delete(id: string, tx: any = prisma) {
    return tx.entityFieldDefinition.delete({
      where: { id },
    });
  }
}
