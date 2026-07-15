import { NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/auth/auth-guard";
import { RuntimeManifest } from "@/modules/platform/runtime/services/manifest-generator";
import { RuntimeRegistry } from "@/shared/components/runtime/registry/RuntimeRegistry";
import { runtimeApplicationEngine } from "@/modules/platform/runtime/application";
import { buildRuntimeContext } from "@/modules/platform/runtime/application/services/RuntimeContextFactory";
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

    const context = buildRuntimeContext({
      manifest,
      session,
      operation: "Load",
      culture: req.headers.get("accept-language") || "en-US",
      timezone: req.headers.get("x-timezone") || "UTC",
      correlationId: req.headers.get("x-correlation-id") || undefined,
    });

    const result = await runtimeApplicationEngine.load(context, { skip, take });
    if (!result.success) {
      return NextResponse.json({ error: result.errors[0], correlationId: result.correlationId }, { status: 400 });
    }

    return NextResponse.json(result.record ?? []);
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

    const context = buildRuntimeContext({
      manifest,
      session,
      operation: "Create",
      culture: req.headers.get("accept-language") || "en-US",
      timezone: req.headers.get("x-timezone") || "UTC",
      correlationId: req.headers.get("x-correlation-id") || undefined,
    });

    const result = await runtimeApplicationEngine.create(context, body);
    if (!result.success) {
      return NextResponse.json({ error: result.errors[0], correlationId: result.correlationId }, { status: 400 });
    }

    return NextResponse.json(result.record, { status: 201 });
  } catch (error: any) {
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

