import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/auth-guard";
import { EntityService } from "@/modules/platform/configuration/services/entity-service";
import { prisma } from "@/lib/prisma";

const service = new EntityService();

export async function GET(req: Request) {
  try {
    const user = requirePermission(req, "PLATFORM_ENTITY_VIEW");
    const list = await service.getAll(true);

    // Attach views to each entity so LookupConfigurator can populate the view dropdown.
    // Fetched in a single bulk query to avoid N+1.
    const entityIds = (list as any[]).map((e: any) => e.id);
    const views = entityIds.length > 0
      ? await prisma.entityView.findMany({
          where: { entityId: { in: entityIds }, status: { not: "ARCHIVED" } },
          select: { id: true, entityId: true, code: true, name: true },
          orderBy: { name: "asc" },
        })
      : [];

    const viewsByEntityId = views.reduce((acc: Record<string, any[]>, v: any) => {
      if (!acc[v.entityId]) acc[v.entityId] = [];
      acc[v.entityId].push({ id: v.id, code: v.code, name: v.name });
      return acc;
    }, {} as Record<string, any[]>);

    const enriched = (list as any[]).map((e: any) => ({
      ...e,
      views: viewsByEntityId[e.id] || [],
    }));

    return NextResponse.json({ success: true, data: enriched });
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: { message: msg, code: "SERVER_ERROR" } }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = requirePermission(req, "PLATFORM_ENTITY_CREATE");
    const body = await req.json();

    const created = await service.create(body, user.tenantId, user.sub);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: { message: msg, code: "SERVER_ERROR" } }, { status: 500 });
  }
}
