import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/permission-guard";
import { CreateApparelSchema } from "@/lib/inventory/validation";
import { createAuditLog } from "@/lib/audit";
import { Prisma } from "@/generated/client";

export async function GET(req: Request) {
    try {
        const user = await requirePermission(req, "INVENTORY_VIEW");

        const apparels = await prisma.apparel.findMany({
            where: { tenantId: user.tenantId },
            include: { category: true },
            orderBy: { name: 'asc' }
        });

        return NextResponse.json(apparels);
    } catch (error) {
        if (error instanceof Response) return error;
        console.error("[APPARELS_GET_ERROR]", error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const user = await requirePermission(req, "INVENTORY_MANAGE");
        const body = await req.json();
        const validated = CreateApparelSchema.parse(body);

        const apparel = await prisma.apparel.create({
            data: {
                tenantId: user.tenantId,
                name: validated.name,
                categoryId: validated.categoryId,
                unit: validated.unit,
                minStockLevel: validated.minStockLevel,
                unitValue: validated.unitValue ? new Prisma.Decimal(validated.unitValue) : undefined,
                isActive: true
            }
        });

        await createAuditLog({
            tenantId: user.tenantId,
            actorUserId: user.sub,
            action: "APPAREL.CREATE",
            details: JSON.stringify(apparel),
            ipAddress: req.headers.get("x-forwarded-for") || "unknown"
        });

        return NextResponse.json(apparel, { status: 201 });
    } catch (error) {
        if (error instanceof Response) return error;
        console.error("[APPARELS_POST_ERROR]", error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
