import { getPool, getAdminAndTenant } from "./lib/demo-db";
import { computeProductionDemand } from "../src/modules/cat/event/domain/production-demand-engine";
import { getProductionCenterData } from "../src/modules/cat/production-center/domain/get-production-center-data";
import { computePurchasePlan } from "../src/modules/cat/purchase-planning/domain/purchase-planning-engine";

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

  // 7. EM-WP10A — Production Center reconciliation. For every Work Date
  // shared by 2+ demo Events, confirm the multi-Event engine call
  // reconciles at every level against itself AND against N independent
  // single-Event calls (the exact same production-demand-engine.ts code
  // path EM-WP10's UI uses) — proves the multi-Event batch query isn't
  // silently dropping or double-counting rows relative to the trusted
  // single-Event path, not just that a number happens to equal itself.
  const sharedDates = await pool.query(
    `SELECT e.event_date::text as work_date, COUNT(*)::int as event_count
       FROM cat_events e
       JOIN cat_quotations q ON q.converted_event_id = e.id
      WHERE q.quotation_number LIKE 'QT-DEMO-%' AND e.event_date IS NOT NULL
      GROUP BY e.event_date
     HAVING COUNT(*) >= 2
      ORDER BY e.event_date`,
    [],
  );

  const TOLERANCE = 0.001;
  function sumByKey(rows: Array<{ quantity: number }>, keyFn: (r: any) => string): Map<string, number> {
    const map = new Map<string, number>();
    for (const r of rows) {
      const key = keyFn(r);
      map.set(key, (map.get(key) || 0) + r.quantity);
    }
    return map;
  }
  function assertMapsEqual(a: Map<string, number>, b: Map<string, number>, label: string) {
    const keys = new Set([...a.keys(), ...b.keys()]);
    for (const key of keys) {
      const av = a.get(key) || 0;
      const bv = b.get(key) || 0;
      if (Math.abs(av - bv) > TOLERANCE) {
        failures.push({ check: "Production Center reconciliation", detail: `${label} mismatch for ${key}: ${av} vs ${bv}` });
      }
    }
  }

  for (const dateRow of sharedDates.rows) {
    const workDate = dateRow.work_date;
    const eventsRes = await pool.query(
      `SELECT e.id FROM cat_events e
         JOIN cat_quotations q ON q.converted_event_id = e.id
        WHERE q.quotation_number LIKE 'QT-DEMO-%' AND e.event_date::text = $1`,
      [workDate],
    );
    const eventIds: string[] = eventsRes.rows.map((r: any) => r.id);

    const multi = await computeProductionDemand(tenantId, eventIds);

    // Level 1: Overall (ingredient+unit) must equal the sum of Event
    // subtotals must equal the sum of Meal subtotals must equal the sum
    // of raw Contributions — all four derived from the same array, at
    // increasing granularity.
    const overall = sumByKey(multi.contributions, (c) => `${c.ingredientId}::${c.unit}`);
    const eventSubtotals = sumByKey(multi.contributions, (c) => `${c.eventId}::${c.ingredientId}::${c.unit}`);
    const mealSubtotals = sumByKey(multi.contributions, (c) => `${c.eventId}::${c.mealId}::${c.ingredientId}::${c.unit}`);
    // Re-derive Overall from each finer level to confirm the rollup is exact.
    const overallFromEvents = new Map<string, number>();
    for (const [key, qty] of eventSubtotals) {
      const ingredientUnit = key.split("::").slice(1).join("::");
      overallFromEvents.set(ingredientUnit, (overallFromEvents.get(ingredientUnit) || 0) + qty);
    }
    const overallFromMeals = new Map<string, number>();
    for (const [key, qty] of mealSubtotals) {
      const parts = key.split("::");
      const ingredientUnit = parts.slice(2).join("::");
      overallFromMeals.set(ingredientUnit, (overallFromMeals.get(ingredientUnit) || 0) + qty);
    }
    assertMapsEqual(overall, overallFromEvents, `${workDate} Overall vs sum(EventSubtotals)`);
    assertMapsEqual(overall, overallFromMeals, `${workDate} Overall vs sum(MealSubtotals)`);

    // Level 2: the multi-Event call's Overall must equal summing N
    // independent single-Event calls (the exact code path EM-WP10 itself
    // uses) — catches a batching bug the self-consistency checks above
    // structurally cannot.
    const perEventTotals = new Map<string, number>();
    for (const eventId of eventIds) {
      const single = await computeProductionDemand(tenantId, [eventId]);
      for (const c of single.contributions) {
        const key = `${c.ingredientId}::${c.unit}`;
        perEventTotals.set(key, (perEventTotals.get(key) || 0) + c.quantity);
      }
    }
    assertMapsEqual(overall, perEventTotals, `${workDate} multi-Event Overall vs sum(single-Event calls)`);

    console.log(`Production Center reconciliation — ${workDate} (${eventIds.length} Events): ${overall.size} ingredient/unit rows checked.`);
  }
  if (sharedDates.rows.length === 0) {
    console.log("Production Center reconciliation — no Work Date is currently shared by 2+ demo Events; skipped (not a failure).");
  }

  // 8. PM-WP02 — Purchase Planning. For every Work Date shared by 2+ demo
  // Events, confirm every Purchase Planning row reconciles exactly
  // against Production Center's own overall[] (same requiredQuantity/
  // unit — never independently recomputed), and confirm each DD-001D
  // scenario ingredient resolves to its documented recommendation
  // outcome. This is the concrete, automatic proof DD-001D's scenarios
  // keep working on every dataset change, not a point-in-time screenshot.
  const DD001D_SCENARIOS: Record<string, { status: string; confidence: string; vendorCount: number }> = {
    Paneer: { status: "READY", confidence: "HIGH", vendorCount: 1 },
    Ghee: { status: "READY", confidence: "LOW", vendorCount: 2 },
    Turmeric: { status: "READY", confidence: "MEDIUM", vendorCount: 1 },
    Salt: { status: "READY", confidence: "HIGH", vendorCount: 5 },
    Coriander: { status: "MULTIPLE_PRIORITY_1_VENDORS", confidence: "NONE", vendorCount: 2 },
    "Bakery Bread": { status: "BLOCKED_PRIORITY_1_VENDOR", confidence: "NONE", vendorCount: 2 },
    Chickpeas: { status: "NO_ACTIVE_VENDOR", confidence: "NONE", vendorCount: 1 },
  };
  const purchasePlanningStatusCounts = new Map<string, Map<string, number>>();

  for (const dateRow of sharedDates.rows) {
    const workDate = dateRow.work_date;
    const production = await getProductionCenterData(tenantId, workDate, "ALL");
    const { rows: planningRows } = await computePurchasePlan(tenantId, production.overall);

    for (const item of production.overall) {
      const planningRow = planningRows.find((r) => r.ingredientId === item.ingredientId && r.unit === item.unit);
      if (!planningRow || Math.abs(planningRow.requiredQuantity - item.quantity) > TOLERANCE) {
        failures.push({
          check: "Purchase Planning reconciliation",
          detail: `${workDate}: "${item.ingredientName}" (${item.unit}) — Purchase Planning quantity does not match Production Center's overall[]`,
        });
      }
    }

    if (workDate === "2026-11-14") {
      for (const [name, expected] of Object.entries(DD001D_SCENARIOS)) {
        const row = planningRows.find((r) => r.ingredientName === name);
        if (!row) {
          failures.push({ check: "DD-001D scenario coverage", detail: `"${name}" not found in Purchase Planning for ${workDate}` });
          continue;
        }
        if (row.status !== expected.status || row.confidence !== expected.confidence || row.vendorsAvailable.length !== expected.vendorCount) {
          failures.push({
            check: "DD-001D scenario coverage",
            detail: `"${name}" expected status=${expected.status} confidence=${expected.confidence} vendors=${expected.vendorCount}, got status=${row.status} confidence=${row.confidence} vendors=${row.vendorsAvailable.length}`,
          });
        }
      }
      // "No Vendor Configured" is deliberately not pinned to one named
      // ingredient (several in-house "Produced" items naturally qualify,
      // and which ones do can shift as recipes change) — assert the
      // scenario is genuinely represented instead.
      const noVendorCount = planningRows.filter((r) => r.status === "NO_VENDOR").length;
      if (noVendorCount === 0) {
        failures.push({ check: "DD-001D scenario coverage", detail: `Expected at least one "No Vendor Configured" ingredient on ${workDate}, found none` });
      }
    }

    const statusCounts = new Map<string, number>();
    for (const row of planningRows) statusCounts.set(row.status, (statusCounts.get(row.status) || 0) + 1);
    purchasePlanningStatusCounts.set(workDate, statusCounts);

    console.log(`Purchase Planning reconciliation — ${workDate}: ${planningRows.length} rows checked against Production Center's overall[].`);
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

  // ---- Vendor Coverage Summary (PM-WP01, non-blocking, informational) ----
  const vendorByCategory = await pool.query(
    `SELECT COALESCE(business_category, 'Uncategorized') as business_category, COUNT(*) AS vendors
       FROM cat_vendors
      WHERE tenant_id = $1
      GROUP BY business_category ORDER BY vendors DESC, business_category`,
    [tenantId],
  );
  const vendorPortfolioCoverage = await pool.query(
    `SELECT COUNT(DISTINCT vi.vendor_id)::int as vendors_with_portfolio, COUNT(vi.id)::int as total_links
       FROM cat_vendors v
       LEFT JOIN cat_vendor_ingredients vi ON vi.vendor_id = v.id
      WHERE v.tenant_id = $1`,
    [tenantId],
  );
  console.log("\nVendor Coverage Summary — by Business Category:");
  for (const row of vendorByCategory.rows) console.log(`  ${row.business_category}: ${row.vendors}`);
  console.log(
    `\nVendors with a Supply Portfolio: ${vendorPortfolioCoverage.rows[0].vendors_with_portfolio} | Total Vendor-Ingredient links: ${vendorPortfolioCoverage.rows[0].total_links}`,
  );

  // ---- Purchase Planning Coverage Summary (PM-WP02, non-blocking, informational) ----
  if (purchasePlanningStatusCounts.size > 0) {
    console.log("\nPurchase Planning Coverage Summary — by Status:");
    for (const [workDate, statusCounts] of purchasePlanningStatusCounts) {
      console.log(`  ${workDate}:`);
      for (const [status, count] of [...statusCounts.entries()].sort((a, b) => b[1] - a[1])) {
        console.log(`    ${status}: ${count}`);
      }
    }
  }

  await pool.end();
  if (failures.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
