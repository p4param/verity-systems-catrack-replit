import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/permission-guard";

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission(req, "CAT_INQUIRY_VIEW");
    const tenantId = user.tenantId;
    const { searchParams } = new URL(req.url);
    const rawQuery = (searchParams.get("query") || "").trim();

    const queryParam = `%${rawQuery}%`;

    const rows: Array<{
      id: string;
      name: string;
      code: string;
      showInDiscoveryQuickSelect: boolean;
      displayOrder: number;
    }> = await prisma.$queryRawUnsafe(
      `SELECT
          id,
          name,
          code,
          show_in_discovery_quick_select as "showInDiscoveryQuickSelect",
          display_order as "displayOrder"
       FROM cat_service_styles
       WHERE tenant_id = $1::uuid
         AND is_deleted = false
         AND is_active = true
         AND ($2 = '%%'
           OR name ILIKE $2
           OR code ILIKE $2)
       ORDER BY display_order ASC, name ASC
       LIMIT 15`,
      tenantId,
      queryParam
    );

    return NextResponse.json({
      success: true,
      items: rows.map((row) => ({
        id: row.id,
        name: row.name,
        code: row.code,
        showInDiscoveryQuickSelect: row.showInDiscoveryQuickSelect,
        displayOrder: row.displayOrder,
      })),
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("Error fetching CAT service styles lookup:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
