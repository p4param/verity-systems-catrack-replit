import { prisma } from "../prisma";
import { Prisma } from "../../generated/client";

export class MasterDataService {
    // -------------------------------------------------------------------------------- //
    // MOVEMENT TYPES
    // -------------------------------------------------------------------------------- //

    static async listMovementTypes(tenantId: number, includeInactive = false) {
        const where: Prisma.MovementTypeWhereInput = { tenantId };
        if (!includeInactive) {
            where.isActive = true;
        }

        return await prisma.movementType.findMany({
            where,
            orderBy: { code: 'asc' }
        });
    }

    static async createMovementType(tenantId: number, data: {
        code: string;
        direction: string;
        affectsClean?: boolean;
        affectsDirty?: boolean;
        isRecoveryType?: boolean;
        isActive?: boolean;
    }) {
        return await prisma.movementType.create({
            data: {
                tenantId,
                code: data.code.toUpperCase(),
                direction: data.direction,
                affectsClean: data.affectsClean ?? false,
                affectsDirty: data.affectsDirty ?? false,
                isRecoveryType: data.isRecoveryType ?? false,
                isSystemControlled: false,
                isActive: data.isActive ?? true
            }
        });
    }

    static async updateMovementType(tenantId: number, id: number, data: Partial<Omit<Prisma.MovementTypeUpdateInput, 'tenantId' | 'isSystemControlled'>>) {
        // Enforce system protection
        const existing = await prisma.movementType.findUniqueOrThrow({ where: { id, tenantId } });

        if (existing.isSystemControlled) {
            // Only allow isActive toggle for system types? The runbook says "Restrict MovementType edits if isSystemControlled = true."
            // We'll restrict ALL edits to system types for safety.
            throw new Error("Cannot edit a system-controlled movement type.");
        }

        return await prisma.movementType.update({
            where: { id, tenantId },
            data
        });
    }

    static async softDeleteMovementType(tenantId: number, id: number) {
        const existing = await prisma.movementType.findUniqueOrThrow({ where: { id, tenantId } });

        if (existing.isSystemControlled) {
            throw new Error("Cannot delete a system-controlled movement type.");
        }

        // Check if referenced in StockMovement
        const inUse = await prisma.stockMovement.findFirst({
            where: { tenantId, movementType: existing.code }
        });

        if (inUse) {
            throw new Error("Cannot delete MovementType because it is referenced in existing StockMovements.");
        }

        return await prisma.movementType.update({
            where: { id, tenantId },
            data: { isActive: false }
        });
    }

    // -------------------------------------------------------------------------------- //
    // REASON CODES
    // -------------------------------------------------------------------------------- //

    static async listReasonCodes(tenantId: number, includeInactive = false) {
        const where: Prisma.ReasonCodeWhereInput = { tenantId };
        if (!includeInactive) where.isActive = true;

        return await prisma.reasonCode.findMany({ where, orderBy: { code: 'asc' } });
    }

    static async createReasonCode(tenantId: number, data: Omit<Prisma.ReasonCodeCreateInput, 'tenant' | 'tenantId'>) {
        return await prisma.reasonCode.create({
            data: { ...data, tenantId }
        });
    }

    static async updateReasonCode(tenantId: number, id: number, data: Partial<Omit<Prisma.ReasonCodeUpdateInput, 'tenantId'>>) {
        return await prisma.reasonCode.update({
            where: { id, tenantId },
            data
        });
    }

    static async softDeleteReasonCode(tenantId: number, id: number) {
        const existing = await prisma.reasonCode.findUniqueOrThrow({ where: { id, tenantId } });

        // Validation: cannot deactivate if used.
        const inUse = await prisma.stockMovement.findFirst({
            where: { tenantId, reason: existing.code }
        });

        if (inUse) {
            throw new Error("Cannot delete ReasonCode because it is referenced in existing StockMovements.");
        }

        return await prisma.reasonCode.update({
            where: { id, tenantId },
            data: { isActive: false }
        });
    }

    // -------------------------------------------------------------------------------- //
    // STOCK CONDITIONS
    // -------------------------------------------------------------------------------- //

    static async listStockConditions(tenantId: number, includeInactive = false) {
        const where: Prisma.StockConditionMasterWhereInput = { tenantId };
        if (!includeInactive) where.isActive = true;
        return await prisma.stockConditionMaster.findMany({ where, orderBy: { code: 'asc' } });
    }

    static async createStockCondition(tenantId: number, data: Omit<Prisma.StockConditionMasterCreateInput, 'tenant' | 'tenantId'>) {
        return await prisma.stockConditionMaster.create({
            data: { ...data, tenantId, code: data.code.toUpperCase() } // Prisma types use string
        });
    }

    static async updateStockCondition(tenantId: number, id: number, data: Partial<Omit<Prisma.StockConditionMasterUpdateInput, 'tenantId'>>) {
        return await prisma.stockConditionMaster.update({
            where: { id, tenantId },
            data
        });
    }

    static async softDeleteStockCondition(tenantId: number, id: number) {
        // Enforce the system conditions (CLEAN/DIRTY) can't be deleted as they are bound to the Enum
        const existing = await prisma.stockConditionMaster.findUniqueOrThrow({ where: { id, tenantId } });
        if (existing.code === "CLEAN" || existing.code === "DIRTY") {
            throw new Error("Cannot delete core system Stock Conditions.");
        }

        return await prisma.stockConditionMaster.update({
            where: { id, tenantId },
            data: { isActive: false }
        });
    }

    // -------------------------------------------------------------------------------- //
    // UNITS OF MEASURE
    // -------------------------------------------------------------------------------- //

    static async listUnits(tenantId: number, includeInactive = false) {
        const where: Prisma.UnitOfMeasureWhereInput = { tenantId };
        if (!includeInactive) where.isActive = true;
        return await prisma.unitOfMeasure.findMany({ where, orderBy: { code: 'asc' } });
    }

    static async createUnit(tenantId: number, data: Omit<Prisma.UnitOfMeasureCreateInput, 'tenant' | 'tenantId'>) {
        return await prisma.unitOfMeasure.create({ data: { ...data, tenantId } });
    }

    static async updateUnit(tenantId: number, id: number, data: Partial<Omit<Prisma.UnitOfMeasureUpdateInput, 'tenantId'>>) {
        return await prisma.unitOfMeasure.update({ where: { id, tenantId }, data });
    }

    static async softDeleteUnit(tenantId: number, id: number) {
        const existing = await prisma.unitOfMeasure.findUniqueOrThrow({ where: { id, tenantId } });
        const inUse = await prisma.apparel.findFirst({ where: { tenantId, unit: existing.code } });
        if (inUse) {
            throw new Error("Cannot delete UnitOfMeasure because it is currently assigned to Apparels.");
        }
        return await prisma.unitOfMeasure.update({ where: { id, tenantId }, data: { isActive: false } });
    }

    // -------------------------------------------------------------------------------- //
    // LOCATIONS
    // -------------------------------------------------------------------------------- //

    static async listLocations(tenantId: number, includeInactive = false) {
        const where: Prisma.LocationWhereInput = { tenantId };
        if (!includeInactive) where.isActive = true;
        return await prisma.location.findMany({ where, orderBy: { name: 'asc' } });
    }

    static async createLocation(tenantId: number, data: Omit<Prisma.LocationCreateInput, 'tenant' | 'tenantId'>) {
        return await prisma.location.create({ data: { ...data, tenantId } });
    }

    static async updateLocation(tenantId: number, id: number, data: Partial<Omit<Prisma.LocationUpdateInput, 'tenantId'>>) {
        return await prisma.location.update({ where: { id, tenantId }, data });
    }

    static async softDeleteLocation(tenantId: number, id: number) {
        return await prisma.location.update({ where: { id, tenantId }, data: { isActive: false } });
    }

    // -------------------------------------------------------------------------------- //
    // DOCUMENT NUMBERING
    // -------------------------------------------------------------------------------- //

    static async listDocumentNumbering(tenantId: number) {
        return await prisma.documentNumbering.findMany({ where: { tenantId, isActive: true } });
    }

    static async updateDocumentNumbering(tenantId: number, id: number, data: Partial<Omit<Prisma.DocumentNumberingUpdateInput, 'tenantId'>>) {
        // "Changing DocumentNumbering must not reset historical records." - Yes, we only change prefix/rules moving forward.
        return await prisma.documentNumbering.update({ where: { id, tenantId }, data });
    }

    // -------------------------------------------------------------------------------- //
    // INVENTORY SETTINGS
    // -------------------------------------------------------------------------------- //

    static async getSettings(tenantId: number) {
        return await prisma.inventorySettings.findUniqueOrThrow({ where: { tenantId } });
    }

    static async updateSettings(tenantId: number, data: Partial<Omit<Prisma.InventorySettingsUpdateInput, 'tenantId'>>) {
        return await prisma.inventorySettings.update({
            where: { tenantId },
            data
        });
    }

    // -------------------------------------------------------------------------------- //
    // SUPPLIERS
    // -------------------------------------------------------------------------------- //

    static async listSuppliers(tenantId: number, includeInactive = false) {
        const where: Prisma.SupplierWhereInput = { tenantId };
        if (!includeInactive) where.isActive = true;
        return await prisma.supplier.findMany({ where, orderBy: { name: 'asc' } });
    }

    static async createSupplier(tenantId: number, data: Omit<Prisma.SupplierCreateInput, 'tenant' | 'tenantId'>) {
        return await prisma.supplier.create({ data: { ...data, tenantId } });
    }

    static async updateSupplier(tenantId: number, id: number, data: Partial<Omit<Prisma.SupplierUpdateInput, 'tenantId'>>) {
        return await prisma.supplier.update({ where: { id, tenantId }, data });
    }

    static async softDeleteSupplier(tenantId: number, id: number) {
        const inUse = await prisma.purchaseOrder.findFirst({ where: { tenantId, supplierId: id } });
        if (inUse) {
            throw new Error("Cannot delete Supplier because it is assigned to existing Purchase Orders.");
        }
        return await prisma.supplier.update({ where: { id, tenantId }, data: { isActive: false } });
    }

    // -------------------------------------------------------------------------------- //
    // VENDORS
    // -------------------------------------------------------------------------------- //

    static async listVendors(tenantId: number, includeInactive = false) {
        const where: Prisma.VendorWhereInput = { tenantId };
        if (!includeInactive) where.isActive = true;
        return await prisma.vendor.findMany({ where, orderBy: { name: 'asc' } });
    }

    static async createVendor(tenantId: number, data: Omit<Prisma.VendorCreateInput, 'tenant' | 'tenantId' | 'laundryOrders'>) {
        return await prisma.vendor.create({ data: { ...data, tenantId } });
    }

    static async updateVendor(tenantId: number, id: number, data: Partial<Omit<Prisma.VendorUpdateInput, 'tenantId'>>) {
        return await prisma.vendor.update({ where: { id, tenantId }, data });
    }

    static async softDeleteVendor(tenantId: number, id: number) {
        const inUse = await prisma.laundryOrder.findFirst({ where: { tenantId, vendorId: id } });
        if (inUse) {
            throw new Error("Cannot delete Vendor because it is assigned to existing Laundry Orders.");
        }
        return await prisma.vendor.update({ where: { id, tenantId }, data: { isActive: false } });
    }

    // -------------------------------------------------------------------------------- //
    // CATEGORIES
    // -------------------------------------------------------------------------------- //

    static async listCategories(tenantId: number, includeInactive = false) {
        const where: Prisma.CategoryWhereInput = { tenantId };
        if (!includeInactive) where.isActive = true;
        return await prisma.category.findMany({ where, orderBy: { name: 'asc' } });
    }

    static async createCategory(tenantId: number, data: { name: string; isActive?: boolean }) {
        return await prisma.category.create({ data: { ...data, tenantId } });
    }

    static async updateCategory(tenantId: number, id: number, data: Partial<Omit<Prisma.CategoryUpdateInput, 'tenantId'>>) {
        return await prisma.category.update({ where: { id, tenantId }, data });
    }

    static async softDeleteCategory(tenantId: number, id: number) {
        const existing = await prisma.category.findUniqueOrThrow({ where: { id, tenantId } });
        const inUse = await prisma.apparel.findFirst({ where: { tenantId, categoryId: existing.id } });
        if (inUse) {
            throw new Error("Cannot delete Category because it is currently assigned to Apparels.");
        }
        return await prisma.category.update({ where: { id, tenantId }, data: { isActive: false } });
    }

}
