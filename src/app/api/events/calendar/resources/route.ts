import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/auth-guard";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const user = requirePermission(req, "INVENTORY_VIEW");
    const tenantUuid = "00000000-0000-0000-0000-" + user.tenantId.toString().padStart(12, "0");

    const resources = await prisma.cateringEventResource.findMany({
      where: { tenantId: tenantUuid, isDeleted: false },
    });

    return NextResponse.json(resources);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[API_CALENDAR_RESOURCES_GET_ERROR]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
