/**
 * VS05HC Global Setup — runs once before all tests in certification/nightly profiles.
 * Creates the VS05HC output directory and writes environment.json.
 */
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { execSync } from "child_process";

export default async function globalSetup() {
  const dir = path.resolve(process.cwd(), "VS05HC");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  let gitCommit = "unknown";
  try { gitCommit = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim(); } catch {}

  let pgVersion = "unknown";
  // We'll get the real PG version from the test that has a DB connection

  const env = {
    certificationVersion: "1.0",
    module: "CM-003",
    profile: process.env.TEST_PROFILE ?? "certification",
    gitCommit,
    generatedAt: new Date().toISOString(),
    node: process.version,
    cpu: os.cpus()[0]?.model ?? "unknown",
    cpuCount: os.cpus().length,
    ramMB: Math.round(os.totalmem() / 1024 / 1024),
    platform: os.platform(),
    arch: os.arch(),
  };

  fs.writeFileSync(path.join(dir, "environment.json"), JSON.stringify(env, null, 2));
  console.log(`\n📋 VS05HC Certification started — artifacts at ${dir}/\n`);
}
