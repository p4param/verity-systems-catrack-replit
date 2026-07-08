import { Prisma } from "../../../generated/client";

/**
 * Append-only financial sub-ledger for vendor accounting.
 * Never update or delete ledger rows.
 * Balance = SUM(debit) - SUM(credit)
 */
export class VendorLedgerService {
    /**
     * Appends a new ledger entry. Must be called within a transaction.
     */
    static async appendEntry(
        data: {
            tenantId: number;
            vendorId: number;
            transactionDate: Date;
            transactionType: string;
            referenceType: string;
            referenceId: number;
            debit: number;
            credit: number;
            remarks?: string;
        },
        tx: Prisma.TransactionClient
    ) {
        return await tx.vendorLedger.create({
            data: {
                tenantId: data.tenantId,
                vendorId: data.vendorId,
                transactionDate: data.transactionDate,
                transactionType: data.transactionType,
                referenceType: data.referenceType,
                referenceId: data.referenceId,
                debit: data.debit,
                credit: data.credit,
                remarks: data.remarks,
            },
        });
    }

    /**
     * Computes the outstanding balance for a vendor.
     * Outstanding = SUM(debit) - SUM(credit)
     */
    static async getBalance(
        tenantId: number,
        vendorId: number,
        tx?: Prisma.TransactionClient
    ): Promise<number> {
        const db = tx || (await import("../../prisma")).prisma;

        const result = await db.vendorLedger.aggregate({
            where: { tenantId, vendorId },
            _sum: { debit: true, credit: true },
        });

        const totalDebit = Number(result._sum.debit ?? 0);
        const totalCredit = Number(result._sum.credit ?? 0);
        return totalDebit - totalCredit;
    }

    /**
     * Gets all ledger entries for a vendor within a date range.
     */
    static async getEntries(
        tenantId: number,
        vendorId: number,
        options?: { fromDate?: Date; toDate?: Date },
        tx?: Prisma.TransactionClient
    ) {
        const db = tx || (await import("../../prisma")).prisma;

        const where: any = { tenantId, vendorId };
        if (options?.fromDate || options?.toDate) {
            where.transactionDate = {};
            if (options.fromDate) where.transactionDate.gte = options.fromDate;
            if (options.toDate) where.transactionDate.lte = options.toDate;
        }

        return await db.vendorLedger.findMany({
            where,
            orderBy: { transactionDate: "asc" },
        });
    }
}
