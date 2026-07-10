import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ moduleCode: string; entityCode: string }> }
) {
  try {
    const { moduleCode, entityCode } = await params;
    
    const entity = await prisma.configurationEntity.findFirst({
      where: {
        OR: [
          { code: { equals: entityCode, mode: 'insensitive' } },
          { route: { equals: `/runtime/${moduleCode}/${entityCode}`, mode: 'insensitive' } }
        ]
      },
    });

    if (!entity || !entity.metadata || typeof entity.metadata !== 'object') {
      return NextResponse.json({ error: "Manifest not found" }, { status: 404 });
    }

    const manifest = (entity.metadata as Record<string, any>).runtimeManifest;
    if (!manifest) {
      return NextResponse.json({ error: "Manifest not found. Entity may not be published." }, { status: 404 });
    }

    return NextResponse.json(manifest);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
