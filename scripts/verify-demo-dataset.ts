import { getPool, getAdminAndTenant } from "./lib/demo-db";

// Official Demo Dataset — Validation (DD-001A).
// Confirms there is no broken production chain anywhere in DD-001: every
// Menu Template item (and, transitively, every Event menu item) resolves
// through a real Recipe Variant to real Ingredient Master rows, every
// Recipe Variant is complete (no placeholder content), and there are no
// orphan or duplicate-default rows. Read-only — makes no changes.
//
// Exits non-zero if any BLOCKING check fails. The Recipe Coverage Summary
// at the end is informational only and never fails the run.

interface Failure {
  check: string;
  detail: string;
}

async function main() {
  const pool = getPool();
  const { tenantId } = await getAdminAndTenant(pool);
  const failures: Failure[] = [];

  // 1. Every Menu Template item resolves to a Menu Catalog item with a Recipe Variant.
  const templateGaps = await pool.query(
    `SELECT DISTINCT ti.item_name
       FROM cat_menu_template_items ti
       JOIN cat_menu_templates t ON t.id = ti.template_id AND t.is_deleted = false
      WHERE ti.tenant_id = $1
        AND NOT EXISTS (
          SELECT 1 FROM cat_menu_catalog_items mi
          JOIN cat_menu_catalog_recipe_variants rv ON rv.catalog_item_id = mi.id
          WHERE mi.tenant_id = ti.tenant_id AND mi.name = ti.item_name
        )
      ORDER BY ti.item_name`,
    [tenantId],
  );
  for (const row of templateGaps.rows) {
    failures.push({ check: "Menu Template coverage", detail: `"${row.item_name}" is referenced by a Menu Template but has no Recipe Variant` });
  }

  // 2. Every Event menu item resolves the same way (transitive: events copy template item_name verbatim, checked directly here too).
  // Scoped to DD-001 demo Events only (reached via QT-DEMO-% Quotations) — this tenant's DB may also
  // contain non-demo Events created outside the seed scripts, which are out of scope for DD-001.
  const eventGaps = await pool.query(
    `SELECT DISTINCT ei.item_name
       FROM cat_event_menu_items ei
      WHERE ei.tenant_id = $1
        AND ei.event_id IN (
          SELECT e.id FROM cat_events e
          JOIN cat_quotations q ON q.converted_event_id = e.id
          WHERE q.quotation_number LIKE 'QT-DEMO-%'
        )
        AND NOT EXISTS (
          SELECT 1 FROM cat_menu_catalog_items mi
          JOIN cat_menu_catalog_recipe_variants rv ON rv.catalog_item_id = mi.id
          WHERE mi.tenant_id = ei.tenant_id AND mi.name = ei.item_name
        )
      ORDER BY ei.item_name`,
    [tenantId],
  );
  for (const row of eventGaps.rows) {
    failures.push({ check: "Event menu chain", detail: `"${row.item_name}" is served on an Event but has no Recipe Variant` });
  }

  // 3. Exactly one Default Variant per Recipe-bearing catalog item (no zero, no duplicates).
  const defaultIssues = await pool.query(
    `SELECT mi.name, COUNT(*) FILTER (WHERE rv.is_default) AS default_count
       FROM cat_menu_catalog_recipe_variants rv
       JOIN cat_menu_catalog_items mi ON mi.id = rv.catalog_item_id
      WHERE rv.tenant_id = $1
      GROUP BY mi.name
     HAVING COUNT(*) FILTER (WHERE rv.is_default) <> 1
      ORDER BY mi.name`,
    [tenantId],
  );
  for (const row of defaultIssues.rows) {
    failures.push({ check: "Default Variant integrity", detail: `"${row.name}" has ${row.default_count} Default Variants (expected exactly 1)` });
  }

  // 4. No orphan Recipe Ingredients / Steps / Equipment (variant_id not resolving to a live Variant).
  for (const [label, table] of [
    ["Recipe Ingredients", "cat_menu_catalog_recipe_ingredients"],
    ["Recipe Steps", "cat_menu_catalog_recipe_steps"],
    ["Recipe Equipment", "cat_menu_catalog_recipe_equipment"],
  ]) {
    const orphans = await pool.query(
      `SELECT COUNT(*) FROM ${table} c
        WHERE c.tenant_id = $1
          AND NOT EXISTS (SELECT 1 FROM cat_menu_catalog_recipe_variants rv WHERE rv.id = c.variant_id)`,
      [tenantId],
    );
    const count = Number(orphans.rows[0].count);
    if (count > 0) failures.push({ check: "Orphan rows", detail: `${count} orphan ${label} row(s) with no matching Recipe Variant` });
  }

  // 5. Every Recipe Ingredient resolves to a live Ingredient Master row.
  const badIngredientRefs = await pool.query(
    `SELECT COUNT(*) FROM cat_menu_catalog_recipe_ingredients ri
      WHERE ri.tenant_id = $1
        AND NOT EXISTS (SELECT 1 FROM cat_ingredient_master_items im WHERE im.id = ri.ingredient_id)`,
    [tenantId],
  );
  const badIngredientCount = Number(badIngredientRefs.rows[0].count);
  if (badIngredientCount > 0) {
    failures.push({ check: "Ingredient Master resolution", detail: `${badIngredientCount} Recipe Ingredient row(s) reference a non-existent Ingredient Master item` });
  }

  // 6. Recipe completeness — Summary, Yield, >=1 Ingredient, >=1 Step, >=1 Equipment.
  const incomplete = await pool.query(
    `SELECT mi.name, rv.variant_name,
            (rv.recipe_summary IS NULL OR rv.recipe_summary = '') AS missing_summary,
            (rv.yield_quantity IS NULL OR rv.yield_quantity <= 0) AS missing_yield,
            (SELECT COUNT(*) FROM cat_menu_catalog_recipe_ingredients ri WHERE ri.variant_id = rv.id) = 0 AS missing_ingredients,
            (SELECT COUNT(*) FROM cat_menu_catalog_recipe_steps rs WHERE rs.variant_id = rv.id) = 0 AS missing_steps,
            (SELECT COUNT(*) FROM cat_menu_catalog_recipe_equipment re WHERE re.variant_id = rv.id) = 0 AS missing_equipment
       FROM cat_menu_catalog_recipe_variants rv
       JOIN cat_menu_catalog_items mi ON mi.id = rv.catalog_item_id
      WHERE rv.tenant_id = $1`,
    [tenantId],
  );
  for (const row of incomplete.rows) {
    const missing: string[] = [];
    if (row.missing_summary) missing.push("summary");
    if (row.missing_yield) missing.push("yield");
    if (row.missing_ingredients) missing.push("ingredients");
    if (row.missing_steps) missing.push("steps");
    if (row.missing_equipment) missing.push("equipment");
    if (missing.length > 0) {
      failures.push({ check: "Recipe completeness", detail: `"${row.name}" / "${row.variant_name}" is missing: ${missing.join(", ")}` });
    }
  }

  // ---- Report ----
  if (failures.length === 0) {
    console.log("PASS — no broken production chains, no orphan rows, no incomplete recipes.\n");
  } else {
    console.log(`FAIL — ${failures.length} issue(s) found:\n`);
    for (const f of failures) console.log(`  [${f.check}] ${f.detail}`);
    console.log("");
  }

  // ---- Recipe Coverage Summary (non-blocking, informational) ----
  const byCuisine = await pool.query(
    `SELECT mi.cuisine, COUNT(*) AS variants
       FROM cat_menu_catalog_recipe_variants rv
       JOIN cat_menu_catalog_items mi ON mi.id = rv.catalog_item_id
      WHERE rv.tenant_id = $1
      GROUP BY mi.cuisine ORDER BY variants DESC, mi.cuisine`,
    [tenantId],
  );
  const byCategory = await pool.query(
    `SELECT mi.category, COUNT(*) AS variants
       FROM cat_menu_catalog_recipe_variants rv
       JOIN cat_menu_catalog_items mi ON mi.id = rv.catalog_item_id
      WHERE rv.tenant_id = $1
      GROUP BY mi.category ORDER BY variants DESC, mi.category`,
    [tenantId],
  );
  console.log("Recipe Coverage Summary — by cuisine:");
  for (const row of byCuisine.rows) console.log(`  ${row.cuisine}: ${row.variants}`);
  console.log("\nRecipe Coverage Summary — by category:");
  for (const row of byCategory.rows) console.log(`  ${row.category}: ${row.variants}`);

  await pool.end();
  if (failures.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
