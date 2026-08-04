import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:Admin%40123@localhost:5432/verity_catrack-ai";
const pool = new Pool({ connectionString });

const TENANT_ID = "97672afb-a724-4290-9706-68699e9ad07d";

const CHECKS: Array<[string, string]> = [
  ["Ingredient Master items", `SELECT COUNT(*) FROM cat_ingredient_master_items WHERE tenant_id = '${TENANT_ID}'`],
  ["Menu Catalog items", `SELECT COUNT(*) FROM cat_menu_catalog_items WHERE tenant_id = '${TENANT_ID}'`],
  ["Recipe Variants", `SELECT COUNT(*) FROM cat_menu_catalog_recipe_variants WHERE tenant_id = '${TENANT_ID}'`],
  ["Recipe Variants -- items with a Default Variant", `SELECT COUNT(DISTINCT catalog_item_id) FROM cat_menu_catalog_recipe_variants WHERE tenant_id = '${TENANT_ID}' AND is_default = true`],
  ["Recipe Ingredients", `SELECT COUNT(*) FROM cat_menu_catalog_recipe_ingredients WHERE tenant_id = '${TENANT_ID}'`],
  ["Recipe Steps", `SELECT COUNT(*) FROM cat_menu_catalog_recipe_steps WHERE tenant_id = '${TENANT_ID}'`],
  ["Menu Templates", `SELECT COUNT(*) FROM cat_menu_templates WHERE tenant_id = '${TENANT_ID}' AND is_deleted = false`],
  ["Template Menu Items", `SELECT COUNT(*) FROM cat_menu_template_items WHERE tenant_id = '${TENANT_ID}'`],
  ["Relationships (demo)", `SELECT COUNT(*) FROM cat_relationships WHERE tenant_id = '${TENANT_ID}' AND relationship_number LIKE 'REL-DEMO-%'`],
  ["Contacts (demo relationships)", `SELECT COUNT(*) FROM cat_contacts c JOIN cat_relationships r ON r.id = c.relationship_id WHERE r.relationship_number LIKE 'REL-DEMO-%'`],
  ["Inquiries (demo)", `SELECT COUNT(*) FROM cat_inquiries WHERE tenant_id = '${TENANT_ID}' AND inquiry_number LIKE 'INQ-DEMO-%'`],
  ["Quotations (demo)", `SELECT COUNT(*) FROM cat_quotations WHERE tenant_id = '${TENANT_ID}' AND quotation_number LIKE 'QT-DEMO-%'`],
  ["Quotations Published", `SELECT COUNT(*) FROM cat_quotations WHERE tenant_id = '${TENANT_ID}' AND quotation_number LIKE 'QT-DEMO-%' AND id IN (SELECT quotation_id FROM cat_quotation_publications)`],
  ["Quotations Accepted (decision)", `SELECT COUNT(*) FROM cat_quotations WHERE tenant_id = '${TENANT_ID}' AND quotation_number LIKE 'QT-DEMO-%' AND id IN (SELECT quotation_id FROM cat_quotation_proposal_decisions WHERE decision = 'ACCEPTED')`],
  ["Quotations Converted to Event", `SELECT COUNT(*) FROM cat_quotations WHERE tenant_id = '${TENANT_ID}' AND quotation_number LIKE 'QT-DEMO-%' AND converted_event_id IS NOT NULL`],
  ["Events (from demo quotations)", `SELECT COUNT(*) FROM cat_events e JOIN cat_quotations q ON q.converted_event_id = e.id WHERE q.quotation_number LIKE 'QT-DEMO-%'`],
  ["Events with Planning", `SELECT COUNT(DISTINCT e.id) FROM cat_events e JOIN cat_quotations q ON q.converted_event_id = e.id JOIN cat_event_planning p ON p.event_id = e.id WHERE q.quotation_number LIKE 'QT-DEMO-%'`],
  ["Events with Menu (meals)", `SELECT COUNT(DISTINCT event_id) FROM cat_event_meals WHERE event_id IN (SELECT e.id FROM cat_events e JOIN cat_quotations q ON q.converted_event_id = e.id WHERE q.quotation_number LIKE 'QT-DEMO-%')`],
];

async function main() {
  for (const [label, sql] of CHECKS) {
    const res = await pool.query(sql);
    console.log(`${label}: ${res.rows[0].count}`);
  }
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
