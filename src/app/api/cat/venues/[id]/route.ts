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

export async function GET(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, "CAT_INQUIRY_VIEW");
    const tenantId = user.tenantId;
    const params = await props.params;
    const id = params?.id;

    const rows: VenueRow[] = await prisma.$queryRawUnsafe(
      `SELECT
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
      WHERE id = $1::uuid
        AND tenant_id = $2::uuid
        AND is_deleted = false
      LIMIT 1`,
      id,
      tenantId,
    );

    if (!rows[0]) {
      return NextResponse.json(
        { success: false, error: "Venue not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      venue: {
        ...rows[0],
        createdAt: rows[0].createdAt.toISOString(),
        updatedAt: rows[0].updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("GET /api/cat/venues/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, "CAT_INQUIRY_EDIT");
    const tenantId = user.tenantId;
    const userId = user.id;
    const params = await props.params;
    const id = params?.id;
    const body = await req.json();

    const venueName = String(body?.venueName || "").trim();
    const venueType = String(body?.venueType || "").trim();

    if (!venueName || !venueType) {
      return NextResponse.json(
        { success: false, error: "Venue Name and Venue Type are required." },
        { status: 400 },
      );
    }

    const status = (String(body?.status || "ACTIVE").trim() || "ACTIVE") as CatVenueStatus;

    const updated: Array<{ id: string }> = await prisma.$queryRawUnsafe(
      `UPDATE cat_venues
      SET
        venue_name = $1,
        venue_type = $2,
        address = $3,
        area_locality = $4,
        city = $5,
        state = $6,
        country = $7,
        pin_code = $8,
        primary_contact_name = $9,
        primary_contact_mobile = $10,
        primary_contact_email = $11,
        notes = $12,
        status = $13,
        updated_at = NOW(),
        updated_by = $14::uuid,
        version = version + 1
      WHERE id = $15::uuid
        AND tenant_id = $16::uuid
        AND is_deleted = false
      RETURNING id`,
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
      userId,
      id,
      tenantId,
    );

    if (!updated[0]) {
      return NextResponse.json(
        { success: false, error: "Venue not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("PATCH /api/cat/venues/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
