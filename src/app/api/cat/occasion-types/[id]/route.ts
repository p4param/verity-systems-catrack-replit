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

export async function GET(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, "CAT_INQUIRY_VIEW");
    const tenantId = user.tenantId;
    const params = await props.params;
    const id = params?.id;

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
      WHERE id = $1::uuid AND tenant_id = $2::uuid AND is_deleted = false`,
      id,
      tenantId
    );

    if (!rows[0]) {
      return NextResponse.json(
        { success: false, error: "Occasion type not found." },
        { status: 404 }
      );
    }

    const r = rows[0];
    return NextResponse.json({
      success: true,
      occasionType: {
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("GET /api/cat/occasion-types/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
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

    const updates: string[] = [];
    const paramsList: any[] = [id, tenantId];
    let paramIndex = 3;

    if (body.name !== undefined) {
      const name = String(body.name || "").trim();
      if (!name) {
        return NextResponse.json(
          { success: false, error: "Name cannot be empty." },
          { status: 400 }
        );
      }
      updates.push(`name = $${paramIndex++}`);
      paramsList.push(name);
    }

    if (body.code !== undefined) {
      updates.push(`code = $${paramIndex++}`);
      paramsList.push(String(body.code || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "_"));
    }

    if (body.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      paramsList.push(Boolean(body.isActive));
    }

    if (body.showInDiscoveryQuickSelect !== undefined) {
      updates.push(`show_in_discovery_quick_select = $${paramIndex++}`);
      paramsList.push(Boolean(body.showInDiscoveryQuickSelect));
    }

    if (body.displayOrder !== undefined) {
      updates.push(`display_order = $${paramIndex++}`);
      paramsList.push(Number(body.displayOrder) || 1);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: "No fields provided to update." },
        { status: 400 }
      );
    }

    updates.push(`updated_at = NOW()`);
    updates.push(`updated_by = $${paramIndex++}::uuid`);
    paramsList.push(userId);

    await prisma.$executeRawUnsafe(
      `UPDATE cat_occasion_types
       SET ${updates.join(", ")}
       WHERE id = $1::uuid AND tenant_id = $2::uuid AND is_deleted = false`,
      ...paramsList
    );

    return NextResponse.json({
      success: true,
      message: "Occasion type updated successfully.",
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("PATCH /api/cat/occasion-types/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, "CAT_INQUIRY_EDIT");
    const tenantId = user.tenantId;
    const userId = user.id;
    const params = await props.params;
    const id = params?.id;

    await prisma.$executeRawUnsafe(
      `UPDATE cat_occasion_types
       SET is_deleted = true, deleted_at = NOW(), updated_at = NOW(), updated_by = $3::uuid
       WHERE id = $1::uuid AND tenant_id = $2::uuid AND is_deleted = false`,
      id,
      tenantId,
      userId
    );

    return NextResponse.json({
      success: true,
      message: "Occasion type deleted successfully.",
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("DELETE /api/cat/occasion-types/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
