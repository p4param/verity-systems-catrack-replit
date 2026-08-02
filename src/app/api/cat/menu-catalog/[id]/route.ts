import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';

// EM-WP05 — Menu Catalog Workspace.
// Single GET/PUT pair for one Catalog item's full field set (Identity,
// Classification, Dietary, Service, Description, Image, Status). No
// versioning, no revision history — editable in place. Catalog edits never
// affect an Event or Template that already added an item "From Catalog";
// that operation only ever copies field values at add-time.

async function fetchItem(id: string, tenantId: string) {
  const rows: any[] = await prisma.$queryRaw`
    SELECT
      id, name, category, cuisine,
      dietary_type as "dietaryType", dietary_notes as "dietaryNotes",
      default_unit as "defaultUnit", serving_notes as "servingNotes",
      description, image_url as "imageUrl", status,
      created_at as "createdAt", updated_at as "updatedAt"
    FROM cat_menu_catalog_items
    WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid AND is_deleted = false
    LIMIT 1
  `;
  return rows[0] || null;
}

export async function GET(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_MENU_CATALOG_VIEW');
    const tenantId = user.tenantId;
    const params = await props.params;
    const { id } = params;

    const item = await fetchItem(id, tenantId);
    if (!item) {
      return NextResponse.json({ success: false, error: 'Menu Catalog item not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, item });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error fetching Menu Catalog item:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_MENU_CATALOG_EDIT');
    const tenantId = user.tenantId;
    const userId = user.id;
    const params = await props.params;
    const { id } = params;

    const existing = await fetchItem(id, tenantId);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Menu Catalog item not found' }, { status: 404 });
    }

    const body = await req.json();
    const {
      name,
      category,
      cuisine,
      dietaryType,
      dietaryNotes,
      defaultUnit,
      servingNotes,
      description,
      imageUrl,
      status,
    } = body as {
      name?: string;
      category?: string;
      cuisine?: string;
      dietaryType?: string;
      dietaryNotes?: string;
      defaultUnit?: string;
      servingNotes?: string;
      description?: string;
      imageUrl?: string;
      status?: string;
    };

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: 'Name is required.' }, { status: 400 });
    }
    if (dietaryType && !['VEG', 'NON_VEG', 'EGG', 'VEGAN'].includes(dietaryType)) {
      return NextResponse.json({ success: false, error: 'Invalid Dietary Type.' }, { status: 400 });
    }
    if (status && !['ACTIVE', 'INACTIVE'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid Status.' }, { status: 400 });
    }

    await prisma.$executeRaw`
      UPDATE cat_menu_catalog_items SET
        name = ${name.trim()},
        category = ${category?.trim() || null},
        cuisine = ${cuisine?.trim() || null},
        dietary_type = ${dietaryType || 'VEG'},
        dietary_notes = ${dietaryNotes?.trim() || null},
        default_unit = ${defaultUnit?.trim() || null},
        serving_notes = ${servingNotes?.trim() || null},
        description = ${description?.trim() || null},
        image_url = ${imageUrl?.trim() || null},
        status = ${status || 'ACTIVE'},
        updated_at = NOW(),
        updated_by = ${userId}::uuid
      WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
    `;

    const updated = await fetchItem(id, tenantId);
    return NextResponse.json({ success: true, item: updated });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error saving Menu Catalog item:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
