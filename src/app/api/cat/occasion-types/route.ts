import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/permission-guard";

type OccasionTypeRow = {
  id: string;
  occasionNumber: string;
  name: string;
  code: string;
  isActive: boolean;
  showInDiscoveryQuickSelect: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission(req, "CAT_INQUIRY_VIEW");
    const tenantId = user.tenantId;

    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("activeOnly") === "true";
    const quickSelectOnly = searchParams.get("quickSelectOnly") === "true";
    const rawQuery = (searchParams.get("query") || "").trim();

    let queryCond = `WHERE tenant_id = $1::uuid AND is_deleted = false`;
    const params: Array<string> = [tenantId];
    if (activeOnly) {
      queryCond += ` AND is_active = true`;
    }
    if (quickSelectOnly) {
      queryCond += ` AND show_in_discovery_quick_select = true`;
    }
    if (rawQuery) {
      params.push(`%${rawQuery}%`);
      queryCond += ` AND (name ILIKE $${params.length} OR code ILIKE $${params.length})`;
    }

    const rows: OccasionTypeRow[] = await prisma.$queryRawUnsafe(
      `SELECT
        id,
        occasion_number as "occasionNumber",
        name,
        code,
        is_active as "isActive",
        show_in_discovery_quick_select as "showInDiscoveryQuickSelect",
        display_order as "displayOrder",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM cat_occasion_types
      ${queryCond}
      ORDER BY display_order ASC, name ASC`,
      ...params
    );

    return NextResponse.json({
      success: true,
      items: rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("GET /api/cat/occasion-types error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch occasion types" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission(req, "CAT_INQUIRY_EDIT");
    const tenantId = user.tenantId;
    const userId = user.id;

    const body = await req.json();

    const name = String(body?.name || "").trim();
    if (!name) {
      return NextResponse.json(
        { success: false, error: "Occasion Name is required." },
        { status: 400 }
      );
    }

    const normName = name.replace(/\s+/g, " ").toLowerCase();

    // Normalized duplicate lookup: tenantId + normName
    const existingMatches: Array<{
      id: string;
      occasion_number: string;
      name: string;
      code: string;
      is_active: boolean;
      show_in_discovery_quick_select: boolean;
      display_order: number;
    }> = await prisma.$queryRawUnsafe(
      `SELECT id, occasion_number as "occasion_number", name, code, is_active, show_in_discovery_quick_select, display_order
       FROM cat_occasion_types
       WHERE tenant_id = $1::uuid
         AND is_deleted = false
         AND LOWER(REGEXP_REPLACE(TRIM(name), '\\s+', ' ', 'g')) = $2
       LIMIT 1`,
      tenantId,
      normName
    );

    if (existingMatches[0]) {
      const match = existingMatches[0];
      return NextResponse.json({
        success: true,
        isDuplicate: true,
        id: match.id,
        occasionType: {
          id: match.id,
          occasionNumber: match.occasion_number,
          name: match.name,
          code: match.code,
          isActive: match.is_active,
          showInDiscoveryQuickSelect: match.show_in_discovery_quick_select,
          displayOrder: match.display_order,
        },
      });
    }

    const code = String(body?.code || name).trim().toUpperCase().replace(/[^A-Z0-9]/g, "_");
    const isActive = body?.isActive !== undefined ? Boolean(body.isActive) : true;
    const showInDiscoveryQuickSelect = body?.showInDiscoveryQuickSelect !== undefined ? Boolean(body.showInDiscoveryQuickSelect) : false;
    const displayOrder = typeof body?.displayOrder === "number" ? body.displayOrder : 1;

    const currentYear = new Date().getFullYear();
    const countRows: Array<{ count: number }> = await prisma.$queryRaw`
      SELECT COUNT(*)::int as count FROM cat_occasion_types WHERE tenant_id = ${tenantId}::uuid
    `;
    const seqNumber = (countRows[0]?.count || 0) + 1;
    const occasionNumber = `OCC-${currentYear}-${String(seqNumber).padStart(4, "0")}`;

    const rows: Array<{ id: string }> = await prisma.$queryRawUnsafe(
      `INSERT INTO cat_occasion_types (
        id, tenant_id, occasion_number, name, code, is_active,
        show_in_discovery_quick_select, display_order, created_at, created_by,
        updated_at, updated_by, is_deleted
      ) VALUES (
        gen_random_uuid(), $1::uuid, $2, $3, $4, $5, $6, $7, NOW(), $8::uuid, NOW(), $8::uuid, false
      ) RETURNING id`,
      tenantId,
      occasionNumber,
      name,
      code,
      isActive,
      showInDiscoveryQuickSelect,
      displayOrder,
      userId
    );

    return NextResponse.json({
      success: true,
      id: rows[0].id,
      message: `Occasion Type '${name}' created successfully.`,
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("POST /api/cat/occasion-types error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create occasion type" },
      { status: 500 }
    );
  }
}
