import { prisma } from "@/lib/prisma";

export class LayoutRepository {
  async getAllByEntityId(entityId: string, tx: any = prisma) {
    return tx.entityLayoutView.findMany({
      where: { entityId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getById(id: string, tx: any = prisma) {
    return tx.entityLayoutView.findUnique({
      where: { id },
    });
  }

  async getByCode(entityId: string, code: string, tx: any = prisma) {
    return tx.entityLayoutView.findFirst({
      where: { entityId, code },
    });
  }

  async getDefaultForEntity(entityId: string, layoutType?: string, tx: any = prisma) {
    return tx.entityLayoutView.findFirst({
      where: {
        entityId,
        isDefault: true,
        ...(layoutType ? { layoutType } : {}),
      },
    });
  }

  async create(data: {
    entityId: string;
    code: string;
    name: string;
    description?: string | null;
    layoutType: string;
    isDefault?: boolean;
    layout: any;
    status?: string;
    createdBy: string;
  }, tx: any = prisma) {
    return tx.entityLayoutView.create({
      data: {
        entityId: data.entityId,
        code: data.code,
        name: data.name,
        description: data.description,
        layoutType: data.layoutType,
        isDefault: data.isDefault ?? false,
        layout: data.layout,
        status: data.status || "DRAFT",
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
      },
    });
  }

  async update(id: string, data: {
    code?: string;
    name?: string;
    description?: string | null;
    layoutType?: string;
    isDefault?: boolean;
    layout?: any;
    status?: string;
    updatedBy: string;
  }, tx: any = prisma) {
    return tx.entityLayoutView.update({
      where: { id },
      data: {
        ...data,
        version: { increment: 1 },
      },
    });
  }

  async delete(id: string, tx: any = prisma) {
    return tx.entityLayoutView.delete({
      where: { id },
    });
  }

  async unsetDefaultForEntity(entityId: string, layoutType?: string, tx: any = prisma) {
    return tx.entityLayoutView.updateMany({
      where: {
        entityId,
        isDefault: true,
        ...(layoutType ? { layoutType } : {}),
      },
      data: { isDefault: false },
    });
  }
}
