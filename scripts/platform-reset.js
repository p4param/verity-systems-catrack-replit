const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { Client } = require("pg");

const PRISMA_CLI = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");

function loadEnvFile() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    const value = rawValue.replace(/^"|"$/g, "");

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    ...options,
  });

  if (result.status !== 0) {
    const full = [command, ...args].join(" ");
    throw new Error(`Command failed (${result.status}): ${full}`);
  }
}

function runPrismaExecuteWithSql(sql, url) {
  const tempFile = path.join(process.cwd(), "db", "migrations", "__tmp_platform_reset.sql");
  fs.writeFileSync(tempFile, sql, "utf8");
  try {
    run(process.execPath, [PRISMA_CLI, "db", "execute", "--file", tempFile, "--url", url]);
  } finally {
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
}

function getCanonicalMigrationFiles() {
  const migrationDir = path.join(process.cwd(), "db", "migrations");
  const sqlServerMarkers = [" IDENTITY(", " NVARCHAR(", " DATETIME2", " SYSUTCDATETIME()"]; 

  return fs
    .readdirSync(migrationDir)
    .filter((file) => file.endsWith(".sql"))
    .filter((file) => !file.includes("_Compat"))
    .filter((file) => {
      const fullPath = path.join(migrationDir, file);
      const sql = fs.readFileSync(fullPath, "utf8").toUpperCase();
      const isSqlServerFile = sqlServerMarkers.some((marker) => sql.includes(marker));
      if (isSqlServerFile) {
        console.log(`Skipping non-PostgreSQL migration: ${file}`);
      }
      return !isSqlServerFile;
    })
    .sort((a, b) => a.localeCompare(b));
}

function buildUrls() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const target = new URL(databaseUrl);
  const dbName = target.pathname.replace(/^\//, "");
  if (!dbName) {
    throw new Error("DATABASE_URL does not include a database name.");
  }

  const maintenance = new URL(databaseUrl);
  maintenance.pathname = "/postgres";

  return {
    databaseUrl: target.toString(),
    maintenanceUrl: maintenance.toString(),
    dbName,
  };
}

function ensureConfirmed() {
  const args = new Set(process.argv.slice(2));
  if (!args.has("--yes")) {
    throw new Error(
      "Refusing to reset without --yes. Usage: node scripts/platform-reset.js --yes"
    );
  }
}

function quoteIdentifier(value) {
  return `"${value.replace(/"/g, '""')}"`;
}

async function resetDatabase(maintenanceUrl, dbName) {
  const client = new Client({ connectionString: maintenanceUrl });
  const dbIdentifier = quoteIdentifier(dbName);

  await client.connect();
  try {
    await client.query(
      `
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = $1
  AND pid <> pg_backend_pid();
`,
      [dbName]
    );

    await client.query(`DROP DATABASE IF EXISTS ${dbIdentifier};`);
    await client.query(`CREATE DATABASE ${dbIdentifier};`);
  } finally {
    await client.end();
  }
}

function applyCanonicalMigrations(databaseUrl) {
  const files = getCanonicalMigrationFiles();
  for (const file of files) {
    const fullPath = path.join("db", "migrations", file);
    run(process.execPath, [PRISMA_CLI, "db", "execute", "--file", fullPath, "--url", databaseUrl]);
  }
}

function applyPrismaSchema() {
  run(process.execPath, [PRISMA_CLI, "db", "push", "--skip-generate"]);
}

function removeLegacyWorkflowTables(databaseUrl) {
  const sql = `
DROP TABLE IF EXISTS workflow_states CASCADE;
DROP TABLE IF EXISTS workflow_definitions CASCADE;
`;

  runPrismaExecuteWithSql(sql, databaseUrl);
}

async function main() {
  loadEnvFile();
  ensureConfirmed();

  const { databaseUrl, maintenanceUrl, dbName } = buildUrls();

  console.log(`Resetting database ${dbName} from canonical migrations...`);
  await resetDatabase(maintenanceUrl, dbName);

  console.log("Applying canonical Prisma schema...");
  applyPrismaSchema();

  console.log("Removing legacy workflow metadata tables before VS07 canonical migration...");
  removeLegacyWorkflowTables(databaseUrl);

  console.log("Applying canonical migrations...");
  applyCanonicalMigrations(databaseUrl);

  console.log("Seeding platform metadata...");
  run(process.execPath, [PRISMA_CLI, "db", "seed"]);

  console.log("Verifying schema consistency...");
  run("node", ["scripts/platform-schema-verify.js"]);

  console.log("Platform reset completed successfully.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
