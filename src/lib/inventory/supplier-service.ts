import { prisma } from "../prisma";
import { Prisma } from "../../generated/client";

export interface CreateSupplierInput {
    tenantId: string;
    name: string;
    contactInfo?: string;
    isActive?: boolean;
}

export interface UpdateSupplierInput {
    id: number;
    tenantId: string;
    name?: string;
    contactInfo?: string;
    isActive?: boolean;
}

export class SupplierService {
    /**
     * Creates a new supplier.
     */
    static async createSupplier(input: CreateSupplierInput) {
        return await prisma.supplier.create({
            data: {
                tenantId: input.tenantId,
                name: input.name,
                contactInfo: input.contactInfo,
                isActive: input.isActive ?? true,
            }
        });
    }

    /**
     * Updates an existing supplier.
     */
    static async updateSupplier(input: UpdateSupplierInput) {
        return await prisma.supplier.update({
            where: {
                id: input.id,
                tenantId: input.tenantId, // Ensure tenant isolation
            },
            data: {
                name: input.name,
                contactInfo: input.contactInfo,
                isActive: input.isActive,
            }
        });
    }

    /**
     * Gets a single supplier.
     */
    static async getSupplier(tenantId: string, id: number) {
        return await prisma.supplier.findUnique({
            where: {
                id,
                tenantId
            }
        });
    }

    /**
     * Gets a list of suppliers for a tenant.
     */
    static async listSuppliers(tenantId: string, options?: { isActive?: boolean }) {
        const where: Prisma.SupplierWhereInput = { tenantId };
        if (options?.isActive !== undefined) {
            where.isActive = options.isActive;
        }

        return await prisma.supplier.findMany({
            where,
            orderBy: { name: 'asc' }
        });
    }

    /**
     * Deletes (or deactivates) a supplier.
     */
    static async deleteSupplier(tenantId: string, id: number) {
        // Typically we soft-delete if there are linked purchase orders
        const usageCount = await prisma.purchaseOrder.count({
            where: { supplierId: id, tenantId }
        });

        if (usageCount > 0) {
            // Soft delete
            return await prisma.supplier.update({
                where: { id, tenantId },
                data: { isActive: false }
            });
        }

        // Hard delete
        return await prisma.supplier.delete({
            where: { id, tenantId }
        });
    }
}

