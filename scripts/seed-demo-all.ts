import { execFileSync } from "child_process";
import { join } from "path";

// Official Demo Dataset — Master Orchestrator.
// Runs every scripts/seed-demo-*.ts script in the correct dependency
// order. Each script is independently idempotent, so this is safe to run
// repeatedly — re-running never creates duplicates, it re-syncs the
// dataset to match the definitions in each script.
//
// Order:
//   1. Ingredient Master, Menu Catalog          (independent master data)
//   2. Vendors                                   (depend on Ingredient Master, for Supply Portfolio)
//   3. Recipe Variants, Menu Templates          (depend on Menu Catalog)
//   4. Relationships                             (independent)
//   5. Inquiries                                 (depend on Relationships)
//   6. Quotations                                (depend on Inquiries)
//   7. Events                                    (depend on Quotations + Menu Templates)

const SCRIPTS = [
  "seed-demo-ingredient-master.ts",
  "seed-demo-vendors.ts",
  "seed-demo-menu-catalog.ts",
  "seed-demo-recipe-variants.ts",
  "seed-demo-menu-templates.ts",
  "seed-demo-relationships.ts",
  "seed-demo-inquiries.ts",
  "seed-demo-quotations.ts",
  "seed-demo-events.ts",
];

async function main() {
  console.log("=== Seeding the Official Catrack Demo Dataset ===\n");

  for (const script of SCRIPTS) {
    const scriptPath = join(__dirname, script);
    console.log(`--- Running ${script} ---`);
    try {
      const output = execFileSync("npx", ["tsx", scriptPath], { encoding: "utf-8", stdio: "pipe", shell: true });
      // Only print the script's own summary line(s), not the noisy TLS warning.
      const lines = output.split("\n").filter((l) => l && !l.includes("NODE_TLS_REJECT_UNAUTHORIZED") && !l.includes("node --trace-warnings"));
      console.log(lines.join("\n"));
    } catch (err: any) {
      console.error(`FAILED: ${script}`);
      console.error(err.stdout || err.message);
      process.exit(1);
    }
    console.log("");
  }

  console.log("=== Demo Dataset Seed Complete ===");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
