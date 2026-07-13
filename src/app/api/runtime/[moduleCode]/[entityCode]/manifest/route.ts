import { NextResponse } from "next/server";
import { RuntimeRegistry } from "@/shared/components/runtime/registry/RuntimeRegistry";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ moduleCode: string; entityCode: string }> }
) {
  try {
    const { moduleCode, entityCode } = await params;
    
    const artifact = await RuntimeRegistry.getActiveArtifact(moduleCode, entityCode);

    if (!artifact) {
      return NextResponse.json({ error: "Runtime Artifact not found. Entity may not be published." }, { status: 404 });
    }

    // Attach artifact diagnostic info to the response
    const responsePayload = {
      ...((artifact.payload as any) || {}),
      _artifact: {
        version: artifact.version,
        generatedAt: artifact.generatedAt,
        generatorVersion: artifact.generatorVersion
      }
    };

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
