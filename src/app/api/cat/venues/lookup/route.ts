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
      venueType: string | null;
      city: string | null;
      primaryContactName: string | null;
      primaryContactMobile: string | null;
    }> = await prisma.$queryRawUnsafe(
      `SELECT
          id,
          venue_name as name,
          venue_type as "venueType",
          city,
          primary_contact_name as "primaryContactName",
          primary_contact_mobile as "primaryContactMobile"
       FROM cat_venues
       WHERE tenant_id = $1::uuid
         AND is_deleted = false
         AND status IN ('ACTIVE', 'DRAFT')
         AND ($2 = '%%'
           OR venue_name ILIKE $2
           OR venue_number ILIKE $2
           OR COALESCE(city, '') ILIKE $2
           OR COALESCE(primary_contact_name, '') ILIKE $2
           OR COALESCE(primary_contact_mobile, '') ILIKE $2)
       ORDER BY venue_name ASC
       LIMIT 15`,
      tenantId,
      queryParam,
    );

    return NextResponse.json({
      success: true,
      items: rows
        .filter((row) => !!row?.id && !!row?.name)
        .map((row) => ({
          id: row.id,
          name: row.name,
          venueType: row.venueType || undefined,
          city: row.city || undefined,
          primaryContactName: row.primaryContactName || undefined,
          primaryContactMobile: row.primaryContactMobile || undefined,
        })),
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("Error fetching CAT venue lookup:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
