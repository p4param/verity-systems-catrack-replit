import { prisma } from "../prisma";
import { Prisma } from "../../generated/client";
import { AvailabilityEngine } from "./availability-engine";

export interface CreateReservationInput {
    tenantId: number;
    eventId: number;
    apparelId: number;
    reservedQty: number;
    createdBy: number;
}

export class ReservationService {
    /**
     * Creates a new logical reservation for an event.
     * Validates that sufficient stock is available BEFORE creating the reservation.
     */
    static async createReservation(input: CreateReservationInput, tx?: Prisma.TransactionClient) {
        // 1. Define the work to be done
        const performWork = async (db: Prisma.TransactionClient) => {
            // Recalculate Availability inside the transaction
            const balances = await AvailabilityEngine.getBalances(input.tenantId, input.apparelId, db);

            // Validate Available Stock
            if (input.reservedQty > balances.available) {
                throw new Error(`Insufficient availability. Requested: ${input.reservedQty}, Available: ${balances.available}`);
            }

            // Create logical reservation
            return await db.eventReservation.create({
                data: {
                    tenantId: input.tenantId,
                    eventId: input.eventId,
                    apparelId: input.apparelId,
                    reservedQty: input.reservedQty,
                    status: "ACTIVE",
                    createdBy: input.createdBy
                }
            });
        };

        // 2. Execute within transaction
        if (tx) {
            return await performWork(tx);
        } else {
            return await prisma.$transaction(async (newTx) => {
                return await performWork(newTx);
            });
        }
    }

    /**
     * Updates the status of a reservation (e.g., RELEASED, COMPLETED, CANCELLED).
     */
    static async updateReservationStatus(id: number, status: 'ACTIVE' | 'RELEASED' | 'COMPLETED' | 'CANCELLED', tx?: Prisma.TransactionClient) {
        const db = tx || prisma;
        return await db.eventReservation.update({
            where: { id },
            data: { status }
        });
    }

    /**
     * Frees up reserved quantities by releasing or cancelling.
     */
    static async releaseReservation(id: number, tx?: Prisma.TransactionClient) {
        return this.updateReservationStatus(id, 'RELEASED', tx);
    }
}
