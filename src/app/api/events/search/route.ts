import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/auth-guard";
import { prisma } from "@/lib/prisma";
import { toCanonicalUuid } from "@/lib/auth/identity-uuid";

export async function GET(req: Request) {
  try {
    const user = requirePermission(req, "INVENTORY_VIEW");
    const tenantUuid = toCanonicalUuid(user.tenantId);
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") || "";

    const events = await prisma.cateringEvent.findMany({
      where: {
        tenantId: tenantUuid,
        isDeleted: false,
        name: { contains: query, mode: "insensitive" },
      },
      take: 10,
    });

    return NextResponse.json(events);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[API_EVENTS_SEARCH_GET_ERROR]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
