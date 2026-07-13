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
  lookupDefinition?: {
    referencedEntityId: string;
    displayFieldId?: string | null;
    valueFieldId?: string | null;
    searchFieldIds?: string[] | null;
    filterConditions?: any | null;
    sortConditions?: any | null;
  } | null;
}

export interface UpdateEntityFieldDto extends Partial<Omit<CreateEntityFieldDto, "entityId" | "code" | "createdBy">> {
  updatedBy: string;
}

export class FieldRepository {
  async getAllByEntityId(entityId: string, tx: any = prisma) {
    return tx.entityFieldDefinition.findMany({
      where: { entityId },
      include: { 
        options: { orderBy: { displayOrder: "asc" } },
        lookupDefinition: true
      },
      orderBy: [{ displayOrder: "asc" }, { label: "asc" }],
    });
  }

  async getById(id: string, tx: any = prisma) {
    return tx.entityFieldDefinition.findUnique({
      where: { id },
      include: { 
        options: { orderBy: { displayOrder: "asc" } },
        lookupDefinition: true
      },
    });
  }

  async getByCode(entityId: string, code: string, tx: any = prisma) {
    return tx.entityFieldDefinition.findUnique({
      where: { entityId_code: { entityId, code } },
      include: { 
        options: { orderBy: { displayOrder: "asc" } },
        lookupDefinition: true
      },
    });
  }

  async create(data: CreateEntityFieldDto, tx: any = prisma) {
    const { options, lookupDefinition, ...restData } = data;
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
        } : undefined,
        lookupDefinition: lookupDefinition ? {
          create: {
            referencedEntityId: lookupDefinition.referencedEntityId,
            displayFieldId: lookupDefinition.displayFieldId,
            valueFieldId: lookupDefinition.valueFieldId,
            searchFieldIds: lookupDefinition.searchFieldIds ?? undefined,
            filterConditions: lookupDefinition.filterConditions ?? undefined,
            sortConditions: lookupDefinition.sortConditions ?? undefined,
          }
        } : undefined
      },
      include: { options: true, lookupDefinition: true }
    });
  }

  async update(id: string, data: UpdateEntityFieldDto, tx: any = prisma) {
    const { updatedBy, options, lookupDefinition, ...rest } = data;
    
    const existing = await tx.entityFieldDefinition.findUnique({
      where: { id },
      include: { lookupDefinition: true }
    });

    if (!existing) {
      throw new Error(`Field not found: ${id}`);
    }
    
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
            create: options.map((opt: any) => ({
              code: opt.code,
              label: opt.label,
              displayOrder: opt.displayOrder ?? 0,
              color: opt.color,
              icon: opt.icon,
              isDefault: opt.isDefault ?? false
            }))
          }
        }),
        ...(lookupDefinition !== undefined && {
          lookupDefinition: lookupDefinition === null ? (existing.lookupDefinition ? {
            delete: true
          } : undefined) : {
            upsert: {
              create: {
                referencedEntityId: lookupDefinition.referencedEntityId,
                displayFieldId: lookupDefinition.displayFieldId,
                valueFieldId: lookupDefinition.valueFieldId,
                searchFieldIds: lookupDefinition.searchFieldIds ?? undefined,
                filterConditions: lookupDefinition.filterConditions ?? undefined,
                sortConditions: lookupDefinition.sortConditions ?? undefined,
              },
              update: {
                referencedEntityId: lookupDefinition.referencedEntityId,
                displayFieldId: lookupDefinition.displayFieldId,
                valueFieldId: lookupDefinition.valueFieldId,
                searchFieldIds: lookupDefinition.searchFieldIds ?? undefined,
                filterConditions: lookupDefinition.filterConditions ?? undefined,
                sortConditions: lookupDefinition.sortConditions ?? undefined,
              }
            }
          }
        })
      },
      include: { options: true, lookupDefinition: true }
    });
  }

  async delete(id: string, tx: any = prisma) {
    return tx.entityFieldDefinition.delete({
      where: { id },
    });
  }
}
