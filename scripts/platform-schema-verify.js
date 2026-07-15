const { PrismaClient } = require("../src/generated/client");

const prisma = new PrismaClient();

async function tableExists(tableName) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1 LIMIT 1`,
    tableName
  );
  return rows.length > 0;
}

async function columnsFor(tableName) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
    tableName
  );
  return new Set(rows.map((row) => row.column_name));
}

async function assertTables(requiredTables) {
  const missing = [];
  for (const table of requiredTables) {
    if (!(await tableExists(table))) {
      missing.push(table);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required tables: ${missing.join(", ")}`);
  }
}

async function assertColumns(tableName, requiredColumns) {
  const columns = await columnsFor(tableName);
  const missing = requiredColumns.filter((column) => !columns.has(column));
  if (missing.length > 0) {
    throw new Error(`Missing columns in ${tableName}: ${missing.join(", ")}`);
  }
}

async function assertNoLegacyCamelCaseWorkflowColumns() {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT table_name, column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name LIKE 'workflow%'
       AND column_name ~ '[A-Z]'`
  );

  if (rows.length > 0) {
    const details = rows
      .map((row) => `${row.table_name}.${row.column_name}`)
      .join(", ");
    throw new Error(`Found legacy non-canonical workflow columns: ${details}`);
  }
}

async function main() {
  const requiredTables = [
    "tenants",
    "users",
    "roles",
    "permissions",
    "workflow_definitions",
    "workflow_versions",
    "workflow_states",
    "workflow_transitions",
    "workflow_conditions",
    "workflow_actions",
    "workflow_assignments",
    "workflow_expressions",
    "workflow_validation_reports",
    "workflow_manifests",
  ];

  await assertTables(requiredTables);

  await assertColumns("workflow_manifests", [
    "runtime_model_json",
    "validation_json",
    "participant_manifest_json",
    "assignment_manifest_json",
    "resolution_manifest_json",
    "designer_snapshot_json",
  ]);

  await assertColumns("workflow_assignments", [
    "assignment_type",
    "target_id",
    "expression_id",
    "lookup_key",
    "sequence",
    "is_required",
  ]);

  await assertNoLegacyCamelCaseWorkflowColumns();

  console.log("Schema verification passed: canonical workflow and platform tables are consistent.");
}

main()
  .catch((error) => {
    console.error("Schema verification failed:", error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
