import { getPool, getAdminAndTenant } from "./lib/demo-db";
import { ALL as INGREDIENT_MASTER_ALL } from "./seed-demo-ingredient-master";
import { ALL as MENU_CATALOG_ALL } from "./seed-demo-menu-catalog";
import { TEMPLATES as MENU_TEMPLATES } from "./seed-demo-menu-templates";

// Official Demo Dataset — Reset Utility.
//
// Removes ONLY the Official Demo Dataset (DD-001). Never touches
// customer/business data. Demo rows are identified exclusively by the
// stable demo business codes (REL-DEMO-*, INQ-DEMO-*, QT-DEMO-*) and, for
// entities that have no DEMO-prefixed code (Menu Templates, Menu Catalog,
// Recipe Variants, Ingredient Master), by the exact name lists that are
// the single source of truth in the corresponding seed-demo-*.ts scripts.
//
// Delete order (dependency order, respects every FK — never disables
// constraints): Events -> Customer Decisions -> Proposal Deliveries ->
// Published Revisions (demo only) -> Quotations -> Inquiries -> Contacts
// -> Relationships -> Menu Templates -> Recipe Variants -> Menu Catalog ->
// Ingredient Master.
//
// Idempotent: safe to run on a full dataset, a partial dataset, or an
// already-empty dataset. Every DELETE is a WHERE-scoped no-op-safe query.

const MENU_TEMPLATE_NAMES = MENU_TEMPLATES.map((t) => t.name);
const MENU_CATALOG_NAMES = MENU_CATALOG_ALL.map((m) => m.name);
const INGREDIENT_MASTER_NAMES = INGREDIENT_MASTER_ALL.map((i) => i.name);

async function main() {
  const pool = getPool();
  const { tenantId } = await getAdminAndTenant(pool);

  // 1. Events — identified transitively via demo Quotations. Must be
  //    deleted first: cat_events holds RESTRICT references into
  //    cat_quotations, cat_quotation_publications, and cat_relationships.
  //    Deleting a cat_events row cascades all of its own child tables
  //    (planning, timeline, menu, dietary, contacts, risks, checklist).
  const eventsResult = await pool.query(
    `DELETE FROM cat_events
     WHERE tenant_id = $1
       AND id IN (
         SELECT converted_event_id FROM cat_quotations
         WHERE tenant_id = $1 AND quotation_number LIKE 'QT-DEMO-%' AND converted_event_id IS NOT NULL
       )`,
    [tenantId],
  );

  // 2. Customer Decisions (demo quotations only).
  const decisionsResult = await pool.query(
    `DELETE FROM cat_quotation_proposal_decisions
     WHERE quotation_id IN (SELECT id FROM cat_quotations WHERE tenant_id = $1 AND quotation_number LIKE 'QT-DEMO-%')`,
    [tenantId],
  );

  // 3. Proposal Deliveries (demo quotations only).
  const deliveriesResult = await pool.query(
    `DELETE FROM cat_quotation_proposal_deliveries
     WHERE quotation_id IN (SELECT id FROM cat_quotations WHERE tenant_id = $1 AND quotation_number LIKE 'QT-DEMO-%')`,
    [tenantId],
  );

  // 4. Published Revisions (demo only) — publications and their revision
  //    lifecycle rows. Safe now that Events (the RESTRICT reference) are
  //    already gone.
  const publicationsResult = await pool.query(
    `DELETE FROM cat_quotation_publications
     WHERE quotation_id IN (SELECT id FROM cat_quotations WHERE tenant_id = $1 AND quotation_number LIKE 'QT-DEMO-%')`,
    [tenantId],
  );
  const revisionsResult = await pool.query(
    `DELETE FROM cat_quotation_revisions
     WHERE quotation_id IN (SELECT id FROM cat_quotations WHERE tenant_id = $1 AND quotation_number LIKE 'QT-DEMO-%')`,
    [tenantId],
  );

  // 5. Quotations — cascades any remaining proposal content (scope
  //    service blocks, highlights, assumptions, exclusions, charges,
  //    discounts, adjustments) automatically.
  const quotationsResult = await pool.query(
    `DELETE FROM cat_quotations WHERE tenant_id = $1 AND quotation_number LIKE 'QT-DEMO-%'`,
    [tenantId],
  );

  // 6. Inquiries.
  const inquiriesResult = await pool.query(
    `DELETE FROM cat_inquiries WHERE tenant_id = $1 AND inquiry_number LIKE 'INQ-DEMO-%'`,
    [tenantId],
  );

  // 7. Contacts (demo relationships only).
  const contactsResult = await pool.query(
    `DELETE FROM cat_contacts
     WHERE relationship_id IN (SELECT id FROM cat_relationships WHERE tenant_id = $1 AND relationship_number LIKE 'REL-DEMO-%')`,
    [tenantId],
  );

  // 8. Relationships — cascades relationship documents/notes and any
  //    remaining contacts automatically.
  const relationshipsResult = await pool.query(
    `DELETE FROM cat_relationships WHERE tenant_id = $1 AND relationship_number LIKE 'REL-DEMO-%'`,
    [tenantId],
  );

  // 9. Menu Templates — cascades meals/categories/items/dietary/settings.
  const templatesResult =
    MENU_TEMPLATE_NAMES.length > 0
      ? await pool.query(
          `DELETE FROM cat_menu_templates WHERE tenant_id = $1 AND template_name = ANY($2::text[])`,
          [tenantId, MENU_TEMPLATE_NAMES],
        )
      : { rowCount: 0 };

  // 10. Recipe Variants (demo menu catalog items only) — cascades
  //     ingredients/steps/equipment for each variant.
  const variantsResult =
    MENU_CATALOG_NAMES.length > 0
      ? await pool.query(
          `DELETE FROM cat_menu_catalog_recipe_variants
           WHERE catalog_item_id IN (SELECT id FROM cat_menu_catalog_items WHERE tenant_id = $1 AND name = ANY($2::text[]))`,
          [tenantId, MENU_CATALOG_NAMES],
        )
      : { rowCount: 0 };

  // 11. Menu Catalog.
  const catalogResult =
    MENU_CATALOG_NAMES.length > 0
      ? await pool.query(`DELETE FROM cat_menu_catalog_items WHERE tenant_id = $1 AND name = ANY($2::text[])`, [
          tenantId,
          MENU_CATALOG_NAMES,
        ])
      : { rowCount: 0 };

  // 12. Ingredient Master.
  const ingredientsResult =
    INGREDIENT_MASTER_NAMES.length > 0
      ? await pool.query(
          `DELETE FROM cat_ingredient_master_items WHERE tenant_id = $1 AND name = ANY($2::text[])`,
          [tenantId, INGREDIENT_MASTER_NAMES],
        )
      : { rowCount: 0 };

  console.log("Demo Dataset Reset — rows removed:");
  console.log(`  Events:                    ${eventsResult.rowCount}`);
  console.log(`  Customer Decisions:        ${decisionsResult.rowCount}`);
  console.log(`  Proposal Deliveries:       ${deliveriesResult.rowCount}`);
  console.log(`  Published Revisions:       ${publicationsResult.rowCount} (publications), ${revisionsResult.rowCount} (revisions)`);
  console.log(`  Quotations:                ${quotationsResult.rowCount}`);
  console.log(`  Inquiries:                 ${inquiriesResult.rowCount}`);
  console.log(`  Contacts:                  ${contactsResult.rowCount}`);
  console.log(`  Relationships:             ${relationshipsResult.rowCount}`);
  console.log(`  Menu Templates:            ${templatesResult.rowCount}`);
  console.log(`  Recipe Variants:           ${variantsResult.rowCount}`);
  console.log(`  Menu Catalog:              ${catalogResult.rowCount}`);
  console.log(`  Ingredient Master:         ${ingredientsResult.rowCount}`);

  await pool.end();
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
