import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/permission-guard";
import { CatVenueStatus, CatVenueType } from "@/modules/cat/venues/types";

type VenueRow = {
  id: string;
  venueNumber: string;
  venueName: string;
  venueType: CatVenueType;
  address: string | null;
  areaLocality: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pinCode: string | null;
  primaryContactName: string | null;
  primaryContactMobile: string | null;
  primaryContactEmail: string | null;
  notes: string | null;
  status: CatVenueStatus;
  creationSource: string | null;
  createdFromModule: string | null;
  createdFromRecordId: string | null;
  createdFromRecordNumber: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission(req, "CAT_INQUIRY_VIEW");
    const tenantId = user.tenantId;

    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("query") || "").trim();
    const status = (searchParams.get("status") || "").trim();
    const venueType = (searchParams.get("venueType") || "").trim();
    const city = (searchParams.get("city") || "").trim();
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

    let whereClause = `WHERE tenant_id = $1::uuid AND is_deleted = false`;

    const params: Array<string | number> = [tenantId];
    let idx = 2;

    if (query) {
      whereClause += `
        AND (
          venue_name ILIKE $${idx}
          OR venue_number ILIKE $${idx}
          OR COALESCE(city, '') ILIKE $${idx}
          OR COALESCE(primary_contact_name, '') ILIKE $${idx}
          OR COALESCE(primary_contact_mobile, '') ILIKE $${idx}
        )
      `;
      params.push(`%${query}%`);
      idx += 1;
    }

    if (status && status !== 'ALL') {
      whereClause += ` AND status = $${idx}`;
      params.push(status);
      idx += 1;
    }

    if (venueType) {
      whereClause += ` AND venue_type = $${idx}`;
      params.push(venueType);
      idx += 1;
    }

    if (city) {
      whereClause += ` AND city ILIKE $${idx}`;
      params.push(`%${city}%`);
      idx += 1;
    }

    const sql = `
      SELECT
        id,
        venue_number as "venueNumber",
        venue_name as "venueName",
        venue_type as "venueType",
        address,
        area_locality as "areaLocality",
        city,
        state,
        country,
        pin_code as "pinCode",
        primary_contact_name as "primaryContactName",
        primary_contact_mobile as "primaryContactMobile",
        primary_contact_email as "primaryContactEmail",
        notes,
        status,
        creation_source as "creationSource",
        created_from_module as "createdFromModule",
        created_from_record_id as "createdFromRecordId",
        created_from_record_number as "createdFromRecordNumber",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM cat_venues
      ${whereClause}
      ORDER BY updated_at DESC LIMIT $${idx} OFFSET $${idx + 1}
    `;

    const rows: VenueRow[] = await prisma.$queryRawUnsafe(
      sql,
      ...params,
      limit,
      offset,
    );

    const countRows: Array<{ count: number }> = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int as count FROM cat_venues ${whereClause}`,
      ...params,
    );

    return NextResponse.json({
      success: true,
      items: rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
      total: countRows[0]?.count ?? rows.length,
      limit,
      offset,
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("GET /api/cat/venues error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission(req, "CAT_INQUIRY_EDIT");
    const tenantId = user.tenantId;
    const userId = user.id;

    const body = await req.json();

    const venueName = String(body?.venueName || "").trim();
    const venueType = String(body?.venueType || "").trim() as CatVenueType;
    const status = (String(body?.status || "ACTIVE").trim() || "ACTIVE") as CatVenueStatus;
    const creationSource = String(body?.creationSource || "MANUAL").trim();
    const createdFromModule = body?.createdFromModule?.trim() || null;
    const createdFromRecordId = body?.createdFromRecordId?.trim() || null;
    const createdFromRecordNumber = body?.createdFromRecordNumber?.trim() || null;

    if (!venueName || !venueType) {
      return NextResponse.json(
        { success: false, error: "Venue Name and Venue Type are required." },
        { status: 400 },
      );
    }

    const normName = venueName.replace(/\s+/g, " ").toLowerCase();
    const rawCity = String(body?.city || "").trim();
    const normCity = rawCity.replace(/\s+/g, " ").toLowerCase();

    // Normalized duplicate lookup: tenantId + normName + venueType + normCity
    const existingMatches: Array<{
      id: string;
      venue_number: string;
      venue_name: string;
      venue_type: CatVenueType;
      city: string | null;
      status: CatVenueStatus;
    }> = await prisma.$queryRawUnsafe(
      `SELECT id, venue_number, venue_name, venue_type, city, status
       FROM cat_venues
       WHERE tenant_id = $1::uuid
         AND is_deleted = false
         AND LOWER(REGEXP_REPLACE(TRIM(venue_name), '\\s+', ' ', 'g')) = $2
         AND venue_type = $3
         AND LOWER(REGEXP_REPLACE(TRIM(COALESCE(city, '')), '\\s+', ' ', 'g')) = $4
       ORDER BY updated_at DESC
       LIMIT 1`,
      tenantId,
      normName,
      venueType,
      normCity,
    );

    if (existingMatches[0]) {
      const match = existingMatches[0];
      return NextResponse.json({
        success: true,
        isDuplicate: true,
        venue: {
          id: match.id,
          venueNumber: match.venue_number,
          venueName: match.venue_name,
          venueType: match.venue_type,
          city: match.city,
          status: match.status,
        },
      });
    }

    const currentYear = new Date().getFullYear();
    const countRows: Array<{ count: number }> = await prisma.$queryRaw`
      SELECT COUNT(*)::int as count
      FROM cat_venues
      WHERE tenant_id = ${tenantId}::uuid
    `;
    const seqNumber = (countRows[0]?.count || 0) + 1;
    const venueNumber = `VEN-${currentYear}-${String(seqNumber).padStart(4, "0")}`;

    const rows: Array<{ id: string }> = await prisma.$queryRawUnsafe(
      `INSERT INTO cat_venues (
        id,
        tenant_id,
        venue_number,
        venue_name,
        venue_type,
        address,
        area_locality,
        city,
        state,
        country,
        pin_code,
        primary_contact_name,
        primary_contact_mobile,
        primary_contact_email,
        notes,
        status,
        creation_source,
        created_from_module,
        created_from_record_id,
        created_from_record_number,
        created_at,
        created_by,
        updated_at,
        updated_by,
        is_deleted
      ) VALUES (
        gen_random_uuid(),
        $1::uuid,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        $12,
        $13,
        $14,
        $15,
        $16,
        $17,
        $18::uuid,
        $19,
        NOW(),
        $20::uuid,
        NOW(),
        $20::uuid,
        false
      ) RETURNING id`,
      tenantId,
      venueNumber,
      venueName,
      venueType,
      body?.address?.trim() || null,
      body?.areaLocality?.trim() || null,
      body?.city?.trim() || null,
      body?.state?.trim() || null,
      body?.country?.trim() || null,
      body?.pinCode?.trim() || null,
      body?.primaryContactName?.trim() || null,
      body?.primaryContactMobile?.trim() || null,
      body?.primaryContactEmail?.trim() || null,
      body?.notes?.trim() || null,
      status,
      creationSource,
      createdFromModule,
      createdFromRecordId,
      createdFromRecordNumber,
      userId,
    );

    return NextResponse.json({
      success: true,
      venue: {
        id: rows[0]?.id,
        venueNumber,
        venueName,
        venueType,
        status,
        creationSource,
        createdFromModule,
        createdFromRecordId,
        createdFromRecordNumber,
      },
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("POST /api/cat/venues error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
