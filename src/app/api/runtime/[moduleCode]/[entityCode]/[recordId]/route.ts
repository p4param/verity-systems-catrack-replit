import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordService } from "@/modules/platform/runtime/services/record-service";
import { requireAuth, requirePermission } from "@/lib/auth/auth-guard";
import { RuntimeManifest } from "@/modules/platform/runtime/services/manifest-generator";

async function getEntityManifest(moduleCode: string, entityCode: string) {
  const entity = await prisma.configurationEntity.findFirst({
    where: {
      OR: [
        { code: { equals: entityCode, mode: 'insensitive' } },
        { route: { equals: `/runtime/${moduleCode}/${entityCode}`, mode: 'insensitive' } }
      ]
    },
  });

  if (!entity || !entity.metadata || typeof entity.metadata !== 'object') {
    return null;
  }

  return {
    entityId: entity.id,
    manifest: (entity.metadata as Record<string, any>).runtimeManifest as RuntimeManifest
  };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ moduleCode: string; entityCode: string; recordId: string }> }
) {
  try {
    const { moduleCode, entityCode, recordId } = await params;
    const session = requireAuth(req);

    const data = await getEntityManifest(moduleCode, entityCode);
    if (!data || !data.manifest) return NextResponse.json({ error: "Manifest not found" }, { status: 404 });

    requirePermission(req, data.manifest.permissions.view);

    const record = await recordService.getRecordById(recordId, data.manifest);
    if (!record) return NextResponse.json({ error: "Record not found" }, { status: 404 });

    return NextResponse.json(record);
  } catch (error: any) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ moduleCode: string; entityCode: string; recordId: string }> }
) {
  try {
    const { moduleCode, entityCode, recordId } = await params;
    const session = requireAuth(req);

    const data = await getEntityManifest(moduleCode, entityCode);
    if (!data || !data.manifest) return NextResponse.json({ error: "Manifest not found" }, { status: 404 });

    requirePermission(req, data.manifest.permissions.edit);

    const body = await req.json();
    console.log(`[API PUT /runtime/${moduleCode}/${entityCode}/${recordId}] Body:`, body);

    const ctx = {
      companyId: "00000000-0000-0000-0000-000000000001",
      branchId: "00000000-0000-0000-0000-000000000001",
      userId: `00000000-0000-0000-0000-${session.sub.toString().padStart(12, '0')}`,
      tenantId: session.tenantId,
      actorUserId: session.sub,
    };

    const record = await recordService.updateRecord(recordId, data.manifest, body, ctx);
    return NextResponse.json(record);
  } catch (error: any) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ moduleCode: string; entityCode: string; recordId: string }> }
) {
  try {
    const { moduleCode, entityCode, recordId } = await params;
    const session = requireAuth(req);

    const data = await getEntityManifest(moduleCode, entityCode);
    if (!data || !data.manifest) return NextResponse.json({ error: "Manifest not found" }, { status: 404 });

    requirePermission(req, data.manifest.permissions.delete);

    const ctx = {
      companyId: "00000000-0000-0000-0000-000000000001",
      branchId: "00000000-0000-0000-0000-000000000001",
      userId: `00000000-0000-0000-0000-${session.sub.toString().padStart(12, '0')}`,
      tenantId: session.tenantId,
      actorUserId: session.sub,
    };

    await recordService.deleteRecord(recordId, data.manifest, ctx);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
