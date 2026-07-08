import { z } from "zod";

export const CreateApparelSchema = z.object({
    name: z.string().min(1),
    categoryId: z.number().int().positive(),
    unit: z.string().min(1),
    minStockLevel: z.number().int().min(0).default(0),
    unitValue: z.number().min(0).optional(),
});

export const CreateEventSchema = z.object({
    name: z.string().min(1),
    eventDate: z.string().refine(v => !isNaN(Date.parse(v))).transform(v => new Date(v)),
    reservations: z.array(z.object({
        apparelId: z.number().int().positive(),
        reservedQty: z.number().int().positive(),
    })).min(1),
});

export const CreateReservationSchema = z.object({
    eventId: z.number().int().positive(),
    apparelId: z.number().int().positive(),
    reservedQty: z.number().int().positive(),
});

export const UpdateReservationSchema = z.object({
    reservedQty: z.number().int().positive().optional(),
    status: z.enum(['ACTIVE', 'RELEASED', 'COMPLETED', 'CANCELLED']).optional(),
});

export const LaundryDispatchSchema = z.object({
    vendorId: z.number().int().positive(),
    expectedReturnDate: z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
    items: z.array(z.object({
        apparelId: z.number().int().positive(),
        quantity: z.number().int().positive(),
    })).min(1),
});

export const LaundryReturnSchema = z.object({
    orderId: z.number().int().positive(),
    items: z.array(z.object({
        apparelId: z.number().int().positive(),
        qtyReturned: z.number().int().min(0),
        qtyDamaged: z.number().int().min(0),
        qtyMissing: z.number().int().min(0),
        lossResponsibility: z.enum(['CUSTOMER', 'LAUNDRY_VENDOR', 'COMPANY', 'EVENT_TEAM', 'UNKNOWN']).optional(),
    })).min(1),
});

export const ManualAdjustmentSchema = z.object({
    apparelId: z.number().int().positive(),
    quantityChange: z.number().int().refine(n => n !== 0, "Quantity change cannot be zero"),
    reason: z.string().min(1),
});
