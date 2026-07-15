import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth-guard";
import { RuntimeManifest } from "@/modules/platform/runtime/services/manifest-generator";
import { RuntimeRegistry } from "@/shared/components/runtime/registry/RuntimeRegistry";
import { runtimeApplicationEngine } from "@/modules/platform/runtime/application";
import { buildRuntimeContext } from "@/modules/platform/runtime/application/services/RuntimeContextFactory";

/**
 * GET /api/runtime/lookup/[entityId]?q=...
 *
 * Resolves lookup options by entity UUID (rather than moduleCode/entityCode).
 * Used by LookupOptionProvider when lookupDefinition.referencedEntityId is set.
 *
 * Uses RuntimeApplicationEngine to keep runtime persistence orchestration
 * centralized in the application layer.
 *
 * Query params:
 *   q       - optional search query (case-insensitive partial label match)
 *   display - optional: field code to use as label (overrides auto-detection)
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ entityId: string }> }
) {
  try {
    const { entityId } = await params;
    const session = requireAuth(req);

    // ── 1. Resolve entity UUID → module code + entity code ────────────────────
    const entity = await prisma.configurationEntity.findUnique({
      where: { id: entityId },
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        module: { select: { code: true } },
      },
    });

    if (!entity) {
      return NextResponse.json(
        { success: false, error: `Entity with ID "${entityId}" not found.` },
        { status: 404 }
      );
    }

    if (entity.status === "ARCHIVED") {
      return NextResponse.json(
        {
          success: false,
          error: `Entity "${entity.code}" is archived and cannot be used for lookups.`,
        },
        { status: 400 }
      );
    }

    const moduleCode = entity.module?.code;
    if (!moduleCode) {
      return NextResponse.json(
        { success: false, error: `Entity "${entity.code}" has no associated module.` },
        { status: 400 }
      );
    }

    // ── 2. Get active runtime artifact ────────────────────────────────────────
    const artifact = await RuntimeRegistry.getActiveArtifact(moduleCode, entity.code);

    if (!artifact) {
      return NextResponse.json(
        {
          success: false,
          error: `No published manifest found for "${moduleCode}/${entity.code}". Publish the entity first.`,
        },
        { status: 400 }
      );
    }

    const manifest = artifact.payload as unknown as RuntimeManifest;

    // ── 3. Resolve display field code ─────────────────────────────────────────
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const displayOverride = searchParams.get("display");

    let displayFieldCode = displayOverride || "id";

    if (!displayOverride) {
      // Priority: NAME > TITLE > CODE > DESCRIPTION > first STRING field
      const priority = ["NAME", "TITLE", "CODE", "DESCRIPTION"];
      for (const candidate of priority) {
        if (manifest.fields.find((f: any) => f.code === candidate)) {
          displayFieldCode = candidate;
          break;
        }
      }
      if (displayFieldCode === "id") {
        const firstString = manifest.fields.find((f: any) => f.dataType === "STRING");
        if (firstString) displayFieldCode = firstString.code;
      }
    }

    // ── 4. Fetch records via Runtime Application Engine ─────────────────────
    const context = buildRuntimeContext({
      manifest,
      session,
      operation: "Load",
      culture: req.headers.get("accept-language") || "en-US",
      timezone: req.headers.get("x-timezone") || "UTC",
      correlationId: req.headers.get("x-correlation-id") || undefined,
    });

    const loadResult = await runtimeApplicationEngine.load(context, { skip: 0, take: 100 });
    if (!loadResult.success) {
      return NextResponse.json(
        { success: false, error: loadResult.errors[0], correlationId: loadResult.correlationId },
        { status: 400 }
      );
    }

    const records = Array.isArray(loadResult.record) ? loadResult.record : [];

    let results = records.map((record: Record<string, any>) => ({
      id: record.id as string,
      label: String(record[displayFieldCode] ?? record.id ?? ""),
    }));

    // Local filter on label
    if (q) {
      const lower = q.toLowerCase();
      results = results.filter((r) => r.label.toLowerCase().includes(lower));
    }

    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    console.error("[Lookup by EntityId] Error:", error);
    if (error instanceof Response) return error;
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch lookup options." },
      { status: 500 }
    );
  }
}
