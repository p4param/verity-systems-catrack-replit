import { prisma } from "@/lib/prisma";
import { ViewType } from "@/generated/client";

export interface CreateEntityViewDto {
  entityId: string;
  code: string;
  name: string;
  viewType: ViewType;
  isDefault?: boolean;
  metadata?: any;
  status?: string;
  createdBy: string;
}

export interface UpdateEntityViewDto extends Partial<Omit<CreateEntityViewDto, "entityId" | "code" | "createdBy">> {
  updatedBy: string;
}

export class ViewRepository {
  async getAllByEntityId(entityId: string, tx: any = prisma) {
    return tx.entityView.findMany({
      where: { entityId },
      orderBy: { name: "asc" },
    });
  }

  async getById(id: string, tx: any = prisma) {
    return tx.entityView.findUnique({
      where: { id },
    });
  }

  async getByCode(entityId: string, code: string, tx: any = prisma) {
    return tx.entityView.findUnique({
      where: { entityId_code: { entityId, code } },
    });
  }

  async unsetDefaultForEntity(entityId: string, tx: any = prisma) {
    return tx.entityView.updateMany({
      where: { entityId, isDefault: true },
      data: { isDefault: false },
    });
  }

  async create(data: CreateEntityViewDto, tx: any = prisma) {
    return tx.entityView.create({
      data: {
        entityId: data.entityId,
        code: data.code,
        name: data.name,
        viewType: data.viewType,
        isDefault: data.isDefault ?? false,
        metadata: data.metadata ?? {},
        status: data.status ?? "DRAFT",
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
      }
    });
  }

  async update(id: string, data: UpdateEntityViewDto, tx: any = prisma) {
    return tx.entityView.update({
      where: { id },
      data: {
        ...data,
        version: { increment: 1 },
      }
    });
  }

  async delete(id: string, tx: any = prisma) {
    return tx.entityView.delete({
      where: { id },
    });
  }
}
