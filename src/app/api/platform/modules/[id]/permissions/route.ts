import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/auth-guard";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requirePermission(req, "PLATFORM_MODULE_VIEW");
    const { id } = await params;

    const [allPermissions, mappings] = await Promise.all([
      prisma.permission.findMany({ orderBy: { code: "asc" } }),
      prisma.platformModulePermission.findMany({
        where: { platformModuleId: id },
        include: { permission: true },
        orderBy: { displayOrder: "asc" }
      })
    ]);

    const mappedPermissionIds = new Set(mappings.map((m) => m.permissionId));
    const mappingByPermId = new Map<string, any>(mappings.map((m: any) => [m.permissionId, m]));

    const result = allPermissions.map((p) => ({
      id: p.id,
      code: p.code,
      description: p.description,
      isSelected: mappedPermissionIds.has(p.id),
      permissionPurpose: mappingByPermId.get(p.id)?.permissionPurpose ?? null,
      isRequired: mappingByPermId.get(p.id)?.isRequired ?? false,
      displayOrder: mappingByPermId.get(p.id)?.displayOrder ?? 0
    }));

    return NextResponse.json({ success: true, data: result });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ success: false, error: { message: e instanceof Error ? e.message : "Server error" } }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requirePermission(req, "PLATFORM_MODULE_UPDATE");
    const { id } = await params;
    const body = await req.json();

    const permissionIds: string[] = body.permissionIds ?? [];

    await prisma.$transaction([
      prisma.platformModulePermission.deleteMany({ where: { platformModuleId: id } }),
      ...permissionIds.map((permId, index) =>
        prisma.platformModulePermission.create({
          data: {
            platformModuleId: id,
            permissionId: permId,
            permissionPurpose: body.purposeMap?.[permId] ?? "MODULE_ACCESS",
            displayOrder: index,
            isRequired: body.requiredSet?.includes(permId) ?? false
          }
        })
      )
    ]);

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ success: false, error: { message: e instanceof Error ? e.message : "Server error" } }, { status: 500 });
  }
}
