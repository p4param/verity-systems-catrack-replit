import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/permission-guard";

function toCsvValue(value: string | undefined | null): string {
  const safe = (value || "").replace(/\r?\n|\r/g, " ");
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission(req, "CAT_INQUIRY_VIEW");
    const tenantId = user.tenantId;

    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("query") || "").trim();
    const status = (searchParams.get("status") || "").trim();
    const venueType = (searchParams.get("venueType") || "").trim();

    let sql = `
      SELECT
        venue_number as "venueNumber",
        venue_name as "venueName",
        venue_type as "venueType",
        city,
        primary_contact_name as "primaryContactName",
        primary_contact_mobile as "primaryContactMobile",
        status,
        created_at as "createdAt"
      FROM cat_venues
      WHERE tenant_id = $1::uuid
        AND is_deleted = false
    `;

    const params: Array<string | number> = [tenantId];
    let idx = 2;

    if (query) {
      sql += ` AND (venue_name ILIKE $${idx} OR venue_number ILIKE $${idx} OR COALESCE(city, '') ILIKE $${idx})`;
      params.push(`%${query}%`);
      idx += 1;
    }

    if (status) {
      sql += ` AND status = $${idx}`;
      params.push(status);
      idx += 1;
    }

    if (venueType) {
      sql += ` AND venue_type = $${idx}`;
      params.push(venueType);
      idx += 1;
    }

    sql += ` ORDER BY created_at DESC`;

    const rows: Array<{
      venueNumber: string;
      venueName: string;
      venueType: string;
      city: string | null;
      primaryContactName: string | null;
      primaryContactMobile: string | null;
      status: string;
      createdAt: Date;
    }> = await prisma.$queryRawUnsafe(sql, ...params);

    const header = [
      "Venue Number",
      "Venue Name",
      "Venue Type",
      "City",
      "Primary Contact",
      "Mobile",
      "Status",
      "Created Date",
    ];

    const csv = [
      header.map((item) => toCsvValue(item)).join(","),
      ...rows.map((row) =>
        [
          row.venueNumber,
          row.venueName,
          row.venueType,
          row.city || "",
          row.primaryContactName || "",
          row.primaryContactMobile || "",
          row.status,
          row.createdAt ? new Date(row.createdAt).toISOString().slice(0, 10) : "",
        ]
          .map((item) => toCsvValue(String(item)))
          .join(","),
      ),
    ].join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=venue-directory-${new Date().toISOString().slice(0, 10)}.csv`,
      },
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("GET /api/cat/venues/export error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
