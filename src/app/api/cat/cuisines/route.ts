import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/permission-guard";

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission(req, "CAT_INQUIRY_VIEW");
    const tenantId = user.tenantId;

    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("activeOnly") === "true";
    const quickSelectOnly = searchParams.get("quickSelectOnly") === "true";

    let queryCond = `WHERE tenant_id = $1::uuid AND is_deleted = false`;
    if (activeOnly) queryCond += ` AND is_active = true`;
    if (quickSelectOnly) queryCond += ` AND show_in_discovery_quick_select = true`;

    const rows: Array<{
      id: string;
      cuisine_number: string;
      name: string;
      code: string;
      is_active: boolean;
      show_in_discovery_quick_select: boolean;
      display_order: number;
    }> = await prisma.$queryRawUnsafe(
      `SELECT id, cuisine_number, name, code, is_active, show_in_discovery_quick_select, display_order
       FROM cat_cuisines
       ${queryCond}
       ORDER BY display_order ASC, name ASC`,
      tenantId
    );

    return NextResponse.json({
      success: true,
      items: rows.map((r) => ({
        id: r.id,
        cuisineNumber: r.cuisine_number,
        name: r.name,
        code: r.code,
        isActive: r.is_active,
        showInDiscoveryQuickSelect: r.show_in_discovery_quick_select,
        displayOrder: r.display_order,
      })),
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("GET /api/cat/cuisines error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch cuisines" },
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
        { success: false, error: "Cuisine Name is required." },
        { status: 400 }
      );
    }

    const normName = name.replace(/\s+/g, " ").toLowerCase();

    // Duplicate Check: tenantId + normName
    const existing: Array<{
      id: string;
      cuisine_number: string;
      name: string;
      code: string;
      is_active: boolean;
      show_in_discovery_quick_select: boolean;
      display_order: number;
    }> = await prisma.$queryRawUnsafe(
      `SELECT id, cuisine_number, name, code, is_active, show_in_discovery_quick_select, display_order
       FROM cat_cuisines
       WHERE tenant_id = $1::uuid
         AND is_deleted = false
         AND LOWER(REGEXP_REPLACE(TRIM(name), '\\s+', ' ', 'g')) = $2
       LIMIT 1`,
      tenantId,
      normName
    );

    if (existing[0]) {
      const match = existing[0];
      return NextResponse.json({
        success: true,
        isDuplicate: true,
        id: match.id,
        cuisine: {
          id: match.id,
          cuisineNumber: match.cuisine_number,
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
    const displayOrder = typeof body?.displayOrder === "number" ? body.displayOrder : 99;

    const currentYear = new Date().getFullYear();
    const countRows: Array<{ count: number }> = await prisma.$queryRaw`
      SELECT COUNT(*)::int as count FROM cat_cuisines WHERE tenant_id = ${tenantId}::uuid
    `;
    const seqNumber = (countRows[0]?.count || 0) + 1;
    const cuisineNumber = `CUI-${currentYear}-${String(seqNumber).padStart(4, "0")}`;

    const rows: Array<{ id: string }> = await prisma.$queryRawUnsafe(
      `INSERT INTO cat_cuisines (
        id, tenant_id, cuisine_number, name, code, is_active,
        show_in_discovery_quick_select, display_order, created_at, created_by,
        updated_at, updated_by, is_deleted
      ) VALUES (
        gen_random_uuid(), $1::uuid, $2, $3, $4, $5, $6, $7, NOW(), $8::uuid, NOW(), $8::uuid, false
      ) RETURNING id`,
      tenantId,
      cuisineNumber,
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
      cuisine: {
        id: rows[0].id,
        cuisineNumber,
        name,
        code,
        isActive,
        showInDiscoveryQuickSelect,
        displayOrder,
      },
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("POST /api/cat/cuisines error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create cuisine" },
      { status: 500 }
    );
  }
}
