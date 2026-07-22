import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/auth-guard";
import { prisma } from "@/lib/prisma";
import { toCanonicalUuid } from "@/lib/auth/identity-uuid";

export async function GET(req: Request) {
  try {
    const user = requirePermission(req, "INVENTORY_VIEW");
    const tenantUuid = toCanonicalUuid(user.tenantId);

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
