import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';

// EM-WP06 — Recipe Management. EM-WP08 — linked Ingredients to Ingredient
// Master (structural relationship only — no conversions, yield loss,
// costing, substitutions, allergens, or inventory behavior).
// Single GET/PUT pair for every Recipe Variant of one Menu Catalog Item
// (Recipe Summary, Yield, Ingredients, Preparation Steps, Equipment &
// Quality). Reuses the CAT_MENU_CATALOG_VIEW/EDIT permissions from
// EM-WP05 — Recipes are part of the Catalog Item's own access boundary,
// not a separate entity. No status, revision, workflow, or approval
// semantics — PUT always reconciles the full current state of every
// Variant and its lists in one transaction, and enforces exactly one
// Default Variant.

interface RecipeIngredientInput {
  id: string;
  ingredientId: string;
  quantity?: number;
  recipeUnit?: string;
  preparationInstruction?: string;
}
interface RecipeStepInput {
  id: string;
  instruction: string;
}
interface RecipeEquipmentInput {
  id: string;
  equipmentName: string;
  notes?: string;
}
interface RecipeVariantInput {
  id: string;
  variantName: string;
  isDefault: boolean;
  recipeSummary?: string;
  yieldQuantity?: number;
  yieldUnit?: string;
  yieldNotes?: string;
  qualityNotes?: string;
  ingredients: RecipeIngredientInput[];
  steps: RecipeStepInput[];
  equipment: RecipeEquipmentInput[];
}

async function ensureCatalogItemInTenant(catalogItemId: string, tenantId: string) {
  const rows: any[] = await prisma.$queryRaw`
    SELECT id FROM cat_menu_catalog_items
    WHERE id = ${catalogItemId}::uuid AND tenant_id = ${tenantId}::uuid AND is_deleted = false
    LIMIT 1
  `;
  return rows[0] || null;
}

async function fetchRecipes(catalogItemId: string, tenantId: string) {
  const variantRows: any[] = await prisma.$queryRaw`
    SELECT
      id, variant_name as "variantName", is_default as "isDefault", recipe_summary as "recipeSummary",
      yield_quantity as "yieldQuantity", yield_unit as "yieldUnit", yield_notes as "yieldNotes",
      quality_notes as "qualityNotes", display_order as "displayOrder"
    FROM cat_menu_catalog_recipe_variants
    WHERE catalog_item_id = ${catalogItemId}::uuid AND tenant_id = ${tenantId}::uuid
    ORDER BY display_order ASC
  `;

  const ingredientRows: any[] = await prisma.$queryRaw`
    SELECT
      r.id, r.variant_id as "variantId", r.ingredient_id as "ingredientId",
      m.ingredient_code as "ingredientCode", m.name as "ingredientName", m.base_unit as "ingredientBaseUnit",
      r.quantity, r.recipe_unit as "recipeUnit", r.preparation_instruction as "preparationInstruction",
      r.display_order as "displayOrder"
    FROM cat_menu_catalog_recipe_ingredients r
    JOIN cat_ingredient_master_items m ON m.id = r.ingredient_id
    WHERE r.catalog_item_id = ${catalogItemId}::uuid AND r.tenant_id = ${tenantId}::uuid
    ORDER BY r.display_order ASC
  `;

  const stepRows: any[] = await prisma.$queryRaw`
    SELECT id, variant_id as "variantId", instruction, display_order as "displayOrder"
    FROM cat_menu_catalog_recipe_steps
    WHERE catalog_item_id = ${catalogItemId}::uuid AND tenant_id = ${tenantId}::uuid
    ORDER BY display_order ASC
  `;

  const equipmentRows: any[] = await prisma.$queryRaw`
    SELECT id, variant_id as "variantId", equipment_name as "equipmentName", notes, display_order as "displayOrder"
    FROM cat_menu_catalog_recipe_equipment
    WHERE catalog_item_id = ${catalogItemId}::uuid AND tenant_id = ${tenantId}::uuid
    ORDER BY display_order ASC
  `;

  const ingredientsByVariant = new Map<string, any[]>();
  for (const row of ingredientRows) {
    const list = ingredientsByVariant.get(row.variantId) || [];
    list.push({ ...row, quantity: row.quantity === null ? undefined : Number(row.quantity) });
    ingredientsByVariant.set(row.variantId, list);
  }
  const stepsByVariant = new Map<string, any[]>();
  for (const row of stepRows) {
    const list = stepsByVariant.get(row.variantId) || [];
    list.push(row);
    stepsByVariant.set(row.variantId, list);
  }
  const equipmentByVariant = new Map<string, any[]>();
  for (const row of equipmentRows) {
    const list = equipmentByVariant.get(row.variantId) || [];
    list.push(row);
    equipmentByVariant.set(row.variantId, list);
  }

  const variants = variantRows.map((variant) => ({
    ...variant,
    yieldQuantity: variant.yieldQuantity === null ? undefined : Number(variant.yieldQuantity),
    ingredients: ingredientsByVariant.get(variant.id) || [],
    steps: stepsByVariant.get(variant.id) || [],
    equipment: equipmentByVariant.get(variant.id) || [],
  }));

  return { variants };
}

export async function GET(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_MENU_CATALOG_VIEW');
    const tenantId = user.tenantId;
    const params = await props.params;
    const { id } = params;

    const item = await ensureCatalogItemInTenant(id, tenantId);
    if (!item) {
      return NextResponse.json({ success: false, error: 'Menu Catalog item not found' }, { status: 404 });
    }

    const recipes = await fetchRecipes(id, tenantId);
    return NextResponse.json({ success: true, ...recipes });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error fetching Recipes:', error);
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

    const item = await ensureCatalogItemInTenant(id, tenantId);
    if (!item) {
      return NextResponse.json({ success: false, error: 'Menu Catalog item not found' }, { status: 404 });
    }

    const body = await req.json();
    const { variants }: { variants?: RecipeVariantInput[] } = body;
    const incomingVariants = Array.isArray(variants) ? variants : [];

    for (const variant of incomingVariants) {
      if (!variant.variantName?.trim()) {
        return NextResponse.json({ success: false, error: 'Variant Name is required for every Recipe Variant.' }, { status: 400 });
      }
      for (const ingredient of variant.ingredients || []) {
        if (!ingredient.ingredientId?.trim()) {
          return NextResponse.json({ success: false, error: 'Ingredient is required for every Ingredient line.' }, { status: 400 });
        }
      }
      for (const step of variant.steps || []) {
        if (!step.instruction?.trim()) {
          return NextResponse.json({ success: false, error: 'Instruction is required for every Preparation Step.' }, { status: 400 });
        }
      }
      for (const equipment of variant.equipment || []) {
        if (!equipment.equipmentName?.trim()) {
          return NextResponse.json({ success: false, error: 'Equipment Name is required for every Equipment entry.' }, { status: 400 });
        }
      }
    }

    // Business Rule: exactly one Default Variant, whenever any Variant exists.
    if (incomingVariants.length > 0) {
      const defaultCount = incomingVariants.filter((v) => v.isDefault).length;
      if (defaultCount === 0) {
        return NextResponse.json({ success: false, error: 'Exactly one Recipe Variant must be set as Default.' }, { status: 400 });
      }
      if (defaultCount > 1) {
        return NextResponse.json({ success: false, error: 'Only one Recipe Variant can be set as Default.' }, { status: 400 });
      }
    }

    // Every referenced Ingredient must exist in this tenant's Ingredient
    // Master — checked up front for a clean 400 instead of a raw FK error.
    const referencedIngredientIds = [...new Set(incomingVariants.flatMap((v) => (v.ingredients || []).map((i) => i.ingredientId)))];
    if (referencedIngredientIds.length > 0) {
      const validIngredients: Array<{ id: string }> = await prisma.$queryRaw`
        SELECT id FROM cat_ingredient_master_items
        WHERE tenant_id = ${tenantId}::uuid AND id = ANY(${referencedIngredientIds}::uuid[]) AND is_deleted = false
      `;
      const validIds = new Set(validIngredients.map((r) => r.id));
      const invalid = referencedIngredientIds.filter((rid) => !validIds.has(rid));
      if (invalid.length > 0) {
        return NextResponse.json({ success: false, error: 'One or more selected Ingredients were not found in Ingredient Master.' }, { status: 400 });
      }
    }

    await prisma.$transaction(async (tx) => {
      // 1. Variants — delete removed (cascades ingredients/steps/equipment), then upsert.
      const existingVariants: Array<{ id: string }> = await tx.$queryRaw`
        SELECT id FROM cat_menu_catalog_recipe_variants WHERE catalog_item_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      `;
      const incomingVariantIds = new Set(incomingVariants.map((v) => v.id));
      for (const row of existingVariants) {
        if (!incomingVariantIds.has(row.id)) {
          await tx.$executeRaw`DELETE FROM cat_menu_catalog_recipe_variants WHERE id = ${row.id}::uuid AND catalog_item_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid`;
        }
      }

      // 2. Ingredients/Steps/Equipment — delete removed, across the whole catalog item.
      const existingIngredients: Array<{ id: string }> = await tx.$queryRaw`
        SELECT id FROM cat_menu_catalog_recipe_ingredients WHERE catalog_item_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      `;
      const incomingIngredientIds = new Set(incomingVariants.flatMap((v) => (v.ingredients || []).map((i) => i.id)));
      for (const row of existingIngredients) {
        if (!incomingIngredientIds.has(row.id)) {
          await tx.$executeRaw`DELETE FROM cat_menu_catalog_recipe_ingredients WHERE id = ${row.id}::uuid AND catalog_item_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid`;
        }
      }

      const existingSteps: Array<{ id: string }> = await tx.$queryRaw`
        SELECT id FROM cat_menu_catalog_recipe_steps WHERE catalog_item_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      `;
      const incomingStepIds = new Set(incomingVariants.flatMap((v) => (v.steps || []).map((s) => s.id)));
      for (const row of existingSteps) {
        if (!incomingStepIds.has(row.id)) {
          await tx.$executeRaw`DELETE FROM cat_menu_catalog_recipe_steps WHERE id = ${row.id}::uuid AND catalog_item_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid`;
        }
      }

      const existingEquipment: Array<{ id: string }> = await tx.$queryRaw`
        SELECT id FROM cat_menu_catalog_recipe_equipment WHERE catalog_item_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      `;
      const incomingEquipmentIds = new Set(incomingVariants.flatMap((v) => (v.equipment || []).map((e) => e.id)));
      for (const row of existingEquipment) {
        if (!incomingEquipmentIds.has(row.id)) {
          await tx.$executeRaw`DELETE FROM cat_menu_catalog_recipe_equipment WHERE id = ${row.id}::uuid AND catalog_item_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid`;
        }
      }

      // 3. Upsert Variants. is_default is written false-for-all first, then
      // true only for the chosen one — avoids transiently violating the
      // "at most one true" partial unique index while multiple rows are
      // being upserted in sequence within the same transaction.
      for (let index = 0; index < incomingVariants.length; index++) {
        const variant = incomingVariants[index];
        await tx.$executeRaw`
          INSERT INTO cat_menu_catalog_recipe_variants (
            id, tenant_id, catalog_item_id, variant_name, is_default, recipe_summary,
            yield_quantity, yield_unit, yield_notes, quality_notes, display_order,
            created_at, created_by, updated_at, updated_by
          ) VALUES (
            ${variant.id}::uuid, ${tenantId}::uuid, ${id}::uuid, ${variant.variantName.trim()}, false,
            ${variant.recipeSummary?.trim() || null}, ${variant.yieldQuantity ?? null}, ${variant.yieldUnit?.trim() || null},
            ${variant.yieldNotes?.trim() || null}, ${variant.qualityNotes?.trim() || null}, ${index},
            NOW(), ${userId}::uuid, NOW(), ${userId}::uuid
          )
          ON CONFLICT (id) DO UPDATE SET
            variant_name = EXCLUDED.variant_name,
            is_default = false,
            recipe_summary = EXCLUDED.recipe_summary,
            yield_quantity = EXCLUDED.yield_quantity,
            yield_unit = EXCLUDED.yield_unit,
            yield_notes = EXCLUDED.yield_notes,
            quality_notes = EXCLUDED.quality_notes,
            display_order = EXCLUDED.display_order,
            updated_at = NOW(),
            updated_by = EXCLUDED.updated_by
          WHERE cat_menu_catalog_recipe_variants.catalog_item_id = EXCLUDED.catalog_item_id
            AND cat_menu_catalog_recipe_variants.tenant_id = EXCLUDED.tenant_id
        `;
      }
      const defaultVariant = incomingVariants.find((v) => v.isDefault);
      if (defaultVariant) {
        await tx.$executeRaw`
          UPDATE cat_menu_catalog_recipe_variants SET is_default = true, updated_at = NOW(), updated_by = ${userId}::uuid
          WHERE id = ${defaultVariant.id}::uuid AND catalog_item_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
        `;
      }

      // 4. Upsert Ingredients/Steps/Equipment, per Variant.
      for (const variant of incomingVariants) {
        const ingredients = variant.ingredients || [];
        for (let index = 0; index < ingredients.length; index++) {
          const ingredient = ingredients[index];
          await tx.$executeRaw`
            INSERT INTO cat_menu_catalog_recipe_ingredients (
              id, tenant_id, catalog_item_id, variant_id, ingredient_id, quantity, recipe_unit, preparation_instruction, display_order,
              created_at, created_by, updated_at, updated_by
            ) VALUES (
              ${ingredient.id}::uuid, ${tenantId}::uuid, ${id}::uuid, ${variant.id}::uuid, ${ingredient.ingredientId}::uuid,
              ${ingredient.quantity ?? null}, ${ingredient.recipeUnit?.trim() || null}, ${ingredient.preparationInstruction?.trim() || null}, ${index},
              NOW(), ${userId}::uuid, NOW(), ${userId}::uuid
            )
            ON CONFLICT (id) DO UPDATE SET
              variant_id = EXCLUDED.variant_id,
              ingredient_id = EXCLUDED.ingredient_id,
              quantity = EXCLUDED.quantity,
              recipe_unit = EXCLUDED.recipe_unit,
              preparation_instruction = EXCLUDED.preparation_instruction,
              display_order = EXCLUDED.display_order,
              updated_at = NOW(),
              updated_by = EXCLUDED.updated_by
            WHERE cat_menu_catalog_recipe_ingredients.catalog_item_id = EXCLUDED.catalog_item_id
              AND cat_menu_catalog_recipe_ingredients.tenant_id = EXCLUDED.tenant_id
          `;
        }

        const steps = variant.steps || [];
        for (let index = 0; index < steps.length; index++) {
          const step = steps[index];
          await tx.$executeRaw`
            INSERT INTO cat_menu_catalog_recipe_steps (id, tenant_id, catalog_item_id, variant_id, instruction, display_order, created_at, created_by, updated_at, updated_by)
            VALUES (${step.id}::uuid, ${tenantId}::uuid, ${id}::uuid, ${variant.id}::uuid, ${step.instruction.trim()}, ${index}, NOW(), ${userId}::uuid, NOW(), ${userId}::uuid)
            ON CONFLICT (id) DO UPDATE SET
              variant_id = EXCLUDED.variant_id,
              instruction = EXCLUDED.instruction,
              display_order = EXCLUDED.display_order,
              updated_at = NOW(),
              updated_by = EXCLUDED.updated_by
            WHERE cat_menu_catalog_recipe_steps.catalog_item_id = EXCLUDED.catalog_item_id
              AND cat_menu_catalog_recipe_steps.tenant_id = EXCLUDED.tenant_id
          `;
        }

        const equipmentList = variant.equipment || [];
        for (let index = 0; index < equipmentList.length; index++) {
          const equipment = equipmentList[index];
          await tx.$executeRaw`
            INSERT INTO cat_menu_catalog_recipe_equipment (id, tenant_id, catalog_item_id, variant_id, equipment_name, notes, display_order, created_at, created_by, updated_at, updated_by)
            VALUES (${equipment.id}::uuid, ${tenantId}::uuid, ${id}::uuid, ${variant.id}::uuid, ${equipment.equipmentName.trim()}, ${equipment.notes?.trim() || null}, ${index}, NOW(), ${userId}::uuid, NOW(), ${userId}::uuid)
            ON CONFLICT (id) DO UPDATE SET
              variant_id = EXCLUDED.variant_id,
              equipment_name = EXCLUDED.equipment_name,
              notes = EXCLUDED.notes,
              display_order = EXCLUDED.display_order,
              updated_at = NOW(),
              updated_by = EXCLUDED.updated_by
            WHERE cat_menu_catalog_recipe_equipment.catalog_item_id = EXCLUDED.catalog_item_id
              AND cat_menu_catalog_recipe_equipment.tenant_id = EXCLUDED.tenant_id
          `;
        }
      }
    });

    const recipes = await fetchRecipes(id, tenantId);
    return NextResponse.json({ success: true, ...recipes });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error saving Recipes:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
