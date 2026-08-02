import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';

// EM-WP07 — Ingredient Master Workspace.
// Single GET/PUT pair for one Ingredient's full field set (Identity,
// Ingredient Type, Base Unit, Purchase Unit, Storage, Shelf Life, Food
// Characteristics, Procurement Category, Description, Image, Status). No
// versioning, no revision history — editable in place. No relationship to
// Recipes, Procurement, or Inventory.

async function fetchItem(id: string, tenantId: string) {
  const rows: any[] = await prisma.$queryRaw`
    SELECT
      id, name, ingredient_type as "ingredientType", base_unit as "baseUnit", purchase_unit as "purchaseUnit",
      storage, shelf_life as "shelfLife", food_characteristics as "foodCharacteristics",
      procurement_category as "procurementCategory", description, image_url as "imageUrl", status,
      created_at as "createdAt", updated_at as "updatedAt"
    FROM cat_ingredient_master_items
    WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid AND is_deleted = false
    LIMIT 1
  `;
  return rows[0] || null;
}

export async function GET(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_INGREDIENT_MASTER_VIEW');
    const tenantId = user.tenantId;
    const params = await props.params;
    const { id } = params;

    const item = await fetchItem(id, tenantId);
    if (!item) {
      return NextResponse.json({ success: false, error: 'Ingredient Master item not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, item });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error fetching Ingredient Master item:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_INGREDIENT_MASTER_EDIT');
    const tenantId = user.tenantId;
    const userId = user.id;
    const params = await props.params;
    const { id } = params;

    const existing = await fetchItem(id, tenantId);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Ingredient Master item not found' }, { status: 404 });
    }

    const body = await req.json();
    const {
      name,
      ingredientType,
      baseUnit,
      purchaseUnit,
      storage,
      shelfLife,
      foodCharacteristics,
      procurementCategory,
      description,
      imageUrl,
      status,
    } = body as {
      name?: string;
      ingredientType?: string;
      baseUnit?: string;
      purchaseUnit?: string;
      storage?: string;
      shelfLife?: string;
      foodCharacteristics?: string;
      procurementCategory?: string;
      description?: string;
      imageUrl?: string;
      status?: string;
    };

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: 'Name is required.' }, { status: 400 });
    }
    if (status && !['ACTIVE', 'INACTIVE'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid Status.' }, { status: 400 });
    }

    await prisma.$executeRaw`
      UPDATE cat_ingredient_master_items SET
        name = ${name.trim()},
        ingredient_type = ${ingredientType?.trim() || null},
        base_unit = ${baseUnit?.trim() || null},
        purchase_unit = ${purchaseUnit?.trim() || null},
        storage = ${storage?.trim() || null},
        shelf_life = ${shelfLife?.trim() || null},
        food_characteristics = ${foodCharacteristics?.trim() || null},
        procurement_category = ${procurementCategory?.trim() || null},
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
    console.error('Error saving Ingredient Master item:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
