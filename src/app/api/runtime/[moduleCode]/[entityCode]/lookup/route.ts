import { NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/auth/auth-guard";
import { RuntimeManifest } from "@/modules/platform/runtime/services/manifest-generator";
import { runtimeApplicationEngine } from "@/modules/platform/runtime/application";
import { buildRuntimeContext } from "@/modules/platform/runtime/application/services/RuntimeContextFactory";

import { RuntimeRegistry } from "@/shared/components/runtime/registry/RuntimeRegistry";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ moduleCode: string; entityCode: string }> }
) {
  try {
    const { moduleCode, entityCode } = await params;
    const session = requireAuth(req);

    const artifact = await RuntimeRegistry.getActiveArtifact(moduleCode, entityCode);

    if (!artifact) {
      return NextResponse.json({ error: "Runtime manifest not found." }, { status: 400 });
    }

    const manifest = artifact.payload as unknown as RuntimeManifest;

    requirePermission(req, manifest.permissions.view);

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";

    const context = buildRuntimeContext({
      manifest,
      session,
      operation: "Load",
      culture: req.headers.get("accept-language") || "en-US",
      timezone: req.headers.get("x-timezone") || "UTC",
      correlationId: req.headers.get("x-correlation-id") || undefined,
    });

    const result = await runtimeApplicationEngine.load(context, { skip: 0, take: 50 });
    if (!result.success) {
      return NextResponse.json({ error: result.errors[0], correlationId: result.correlationId }, { status: 400 });
    }

    const records = Array.isArray(result.record) ? result.record : [];

    // Identify display field. Prefer "name", "title", "code", or first TEXT field.
    let displayFieldCode = "id";
    const possibleFields = ["NAME", "TITLE", "CODE", "DESCRIPTION"];
    for (const f of possibleFields) {
      if (manifest.fields.find(mf => mf.code === f)) {
        displayFieldCode = f;
        break;
      }
    }
    
    if (displayFieldCode === "id") {
      const firstTextField = manifest.fields.find(f => f.dataType === "STRING");
      if (firstTextField) displayFieldCode = firstTextField.code;
    }

    const results = records.map((record: any) => ({
      id: record.id,
      label: record[displayFieldCode] || record.id
    }));

    // Local filter if 'q' is present
    const filteredResults = q ? results.filter((r: any) => String(r.label).toLowerCase().includes(q.toLowerCase())) : results;

    return NextResponse.json(filteredResults);
  } catch (error: any) {
    console.error("Lookup API Error:", error);
    if (error instanceof NextResponse) {
      return error;
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

