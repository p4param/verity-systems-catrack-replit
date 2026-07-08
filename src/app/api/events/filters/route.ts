import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/auth-guard";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const user = requirePermission(req, "INVENTORY_VIEW");
    const tenantUuid = "00000000-0000-0000-0000-" + user.tenantId.toString().padStart(12, "0");

    console.log("[FILTERS_API_DEBUG] user:", user, "tenantUuid:", tenantUuid);

    const [statuses, types, priorities] = await Promise.all([
      prisma.cateringEventStatus.findMany({
        where: { tenantId: tenantUuid },
        select: { id: true, name: true, code: true },
        orderBy: { name: "asc" },
      }),
      prisma.cateringEventType.findMany({
        where: { tenantId: tenantUuid },
        select: { id: true, name: true, code: true },
        orderBy: { name: "asc" },
      }),
      prisma.cateringEventPriority.findMany({
        where: { tenantId: tenantUuid },
        select: { id: true, name: true, code: true },
        orderBy: { name: "asc" },
      }),
    ]);

    console.log("[FILTERS_API_DEBUG] statuses count:", statuses.length, "types count:", types.length, "priorities count:", priorities.length);

    return NextResponse.json({ statuses, types, priorities });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[API_EVENTS_FILTERS_GET_ERROR]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
