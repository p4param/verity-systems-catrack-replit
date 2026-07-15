import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordService } from "@/modules/platform/runtime/services/record-service";
import { requireAuth, requirePermission } from "@/lib/auth/auth-guard";
import { RuntimeManifest } from "@/modules/platform/runtime/services/manifest-generator";
import { RuntimeRegistry } from "@/shared/components/runtime/registry/RuntimeRegistry";
// We have to use Promise resolving for dynamic route params in Next 15+
export async function GET(
  req: Request,
  { params }: { params: Promise<{ moduleCode: string; entityCode: string }> }
) {
  try {
    const { moduleCode, entityCode } = await params;
    const session = requireAuth(req);

    const artifact = await RuntimeRegistry.getActiveArtifact(moduleCode, entityCode);

    if (!artifact) {
      return NextResponse.json({ error: "Runtime manifest not found. Please publish the entity." }, { status: 400 });
    }

    const manifest = artifact.payload as unknown as RuntimeManifest;

    requirePermission(req, manifest.permissions.view);

    // Simplistic query mapping
    const { searchParams } = new URL(req.url);
    const skip = parseInt(searchParams.get("skip") || "0", 10);
    const take = parseInt(searchParams.get("take") || "50", 10);
    
    // Pass tenant ID context if it exists in session
    // For now, mocking with session.user.id mapping if tenant info isn't available
    const records = await recordService.getRecords(artifact.entityId, manifest, { skip, take }, { companyId: "00000000-0000-0000-0000-000000000001", branchId: "00000000-0000-0000-0000-000000000001", userId: `00000000-0000-0000-0000-${session.sub.toString().padStart(12, "0")}`, tenantId: session.tenantId, actorUserId: session.sub });

    return NextResponse.json(records);
  } catch (error: any) {
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ moduleCode: string; entityCode: string }> }
) {
  try {
    const { moduleCode, entityCode } = await params;
    const session = requireAuth(req);

    const artifact = await RuntimeRegistry.getActiveArtifact(moduleCode, entityCode);

    if (!artifact) {
      return NextResponse.json({ error: "Runtime manifest not found. Please publish the entity." }, { status: 400 });
    }

    const manifest = artifact.payload as unknown as RuntimeManifest;

    requirePermission(req, manifest.permissions.create);

    const body = await req.json();

    const userUuid = `00000000-0000-0000-0000-${session.sub.toString().padStart(12, '0')}`;

    const ctx = {
      companyId: "00000000-0000-0000-0000-000000000001", // Placeholder
      branchId: "00000000-0000-0000-0000-000000000001", // Placeholder
      userId: userUuid,
      tenantId: session.tenantId,
      actorUserId: session.sub, 
    };

    const record = await recordService.createRecord(artifact.entityId, manifest, body, ctx);

    return NextResponse.json(record, { status: 201 });
  } catch (error: any) {
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

