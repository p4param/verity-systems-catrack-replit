import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/auth-guard";
import { prisma } from "@/lib/prisma";
import { toCanonicalUuid } from "@/lib/auth/identity-uuid";

export async function GET(req: Request) {
  try {
    const user = requirePermission(req, "INVENTORY_VIEW");
    const tenantUuid = toCanonicalUuid(user.tenantId);

    const [statuses, types, priorities] = await Promise.all([
      prisma.cateringEventStatus.findMany({
        where: { tenantId: tenantUuid, isDeleted: false },
        select: { id: true, name: true, code: true },
        orderBy: { name: "asc" },
      }),
      prisma.cateringEventType.findMany({
        where: { tenantId: tenantUuid, isDeleted: false },
        select: { id: true, name: true, code: true },
        orderBy: { name: "asc" },
      }),
      prisma.cateringEventPriority.findMany({
        where: { tenantId: tenantUuid, isDeleted: false },
        select: { id: true, name: true, code: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({ statuses, types, priorities });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[API_EVENTS_FILTERS_GET_ERROR]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
