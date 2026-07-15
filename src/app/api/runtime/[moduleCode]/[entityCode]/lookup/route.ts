import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordService } from "@/modules/platform/runtime/services/record-service";
import { requireAuth, requirePermission } from "@/lib/auth/auth-guard";
import { RuntimeManifest } from "@/modules/platform/runtime/services/manifest-generator";

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
    
    // Simplistic search: just get 50 records. 
    const records = await recordService.getRecords(artifact.entityId, manifest, { skip: 0, take: 50 }, { companyId: "00000000-0000-0000-0000-000000000001", branchId: "00000000-0000-0000-0000-000000000001", userId: `00000000-0000-0000-0000-${session.sub.toString().padStart(12, "0")}`, tenantId: session.tenantId, actorUserId: session.sub });

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

