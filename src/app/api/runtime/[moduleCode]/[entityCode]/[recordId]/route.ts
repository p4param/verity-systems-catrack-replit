import { NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/auth/auth-guard";
import { RuntimeManifest } from "@/modules/platform/runtime/services/manifest-generator";
import { runtimeApplicationEngine } from "@/modules/platform/runtime/application";
import { buildRuntimeContext } from "@/modules/platform/runtime/application/services/RuntimeContextFactory";

import { RuntimeRegistry } from "@/shared/components/runtime/registry/RuntimeRegistry";

async function getEntityManifest(moduleCode: string, entityCode: string) {
  const artifact = await RuntimeRegistry.getActiveArtifact(moduleCode, entityCode);

  if (!artifact) {
    return null;
  }

  return {
    entityId: artifact.entityId,
    manifest: artifact.payload as unknown as RuntimeManifest
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

    const context = buildRuntimeContext({
      manifest: data.manifest,
      session,
      operation: "Load",
      recordId,
      culture: req.headers.get("accept-language") || "en-US",
      timezone: req.headers.get("x-timezone") || "UTC",
      correlationId: req.headers.get("x-correlation-id") || undefined,
    });

    const result = await runtimeApplicationEngine.load(context);
    if (!result.success) {
      return NextResponse.json({ error: result.errors[0], correlationId: result.correlationId }, { status: 400 });
    }

    const record = result.record;
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

    const context = buildRuntimeContext({
      manifest: data.manifest,
      session,
      operation: "Save",
      recordId,
      culture: req.headers.get("accept-language") || "en-US",
      timezone: req.headers.get("x-timezone") || "UTC",
      correlationId: req.headers.get("x-correlation-id") || undefined,
    });

    const result = await runtimeApplicationEngine.save(context, body);
    if (!result.success) {
      return NextResponse.json({ error: result.errors[0], correlationId: result.correlationId }, { status: 400 });
    }

    return NextResponse.json(result.record);
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

    const context = buildRuntimeContext({
      manifest: data.manifest,
      session,
      operation: "Delete",
      recordId,
      culture: req.headers.get("accept-language") || "en-US",
      timezone: req.headers.get("x-timezone") || "UTC",
      correlationId: req.headers.get("x-correlation-id") || undefined,
    });

    const result = await runtimeApplicationEngine.delete(context);
    if (!result.success) {
      return NextResponse.json({ error: result.errors[0], correlationId: result.correlationId }, { status: 400 });
    }

    return NextResponse.json({ success: true, correlationId: result.correlationId });
  } catch (error: any) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

