import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/permission-guard";

export async function GET(req: Request) {
    try {
        const user = await requirePermission(req, "INVENTORY_VIEW");

        const categories = await prisma.category.findMany({
            where: { tenantId: user.tenantId, isActive: true },
            orderBy: { name: 'asc' }
        });

        return NextResponse.json(categories);
    } catch (error) {
        if (error instanceof Response) return error;
        console.error("[CATEGORIES_GET_ERROR]", error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
