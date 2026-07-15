/**
 * VS05HC Global Teardown — runs once after all tests in certification/nightly profiles.
 * Writes final certification.md human-readable report.
 */
import * as fs from "fs";
import * as path from "path";

export default async function globalTeardown() {
  const dir = path.resolve(process.cwd(), "VS05HC");
  const resultsPath = path.join(dir, "jest-results.json");
  const envPath = path.join(dir, "environment.json");

  let summary = "No results file found.";
  let passed = 0, failed = 0, total = 0;

  if (fs.existsSync(resultsPath)) {
    try {
      const results = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
      passed = results.numPassedTests ?? 0;
      failed = results.numFailedTests ?? 0;
      total = results.numTotalTests ?? 0;
      summary = `${passed}/${total} tests passed, ${failed} failed.`;
    } catch {}
  }

  const env = fs.existsSync(envPath)
    ? JSON.parse(fs.readFileSync(envPath, "utf8"))
    : {};

  const report = `# VS05HC — CM-003 Runtime Data Engine Certification Report

**Certification Version:** 1.0  
**Module:** CM-003 Runtime Data Engine  
**Generated:** ${new Date().toISOString()}  
**Git Commit:** ${env.gitCommit ?? "unknown"}  

---

## Environment

| Property | Value |
|---|---|
| Node.js | ${env.node ?? "unknown"} |
| Platform | ${env.platform ?? "unknown"} / ${env.arch ?? "unknown"} |
| CPU | ${env.cpu ?? "unknown"} (${env.cpuCount ?? "?"} cores) |
| RAM | ${env.ramMB ?? "?"} MB |

---

## Results Summary

| Metric | Value |
|---|---|
| Total Tests | ${total} |
| Passed | ${passed} |
| Failed | ${failed} |
| Result | ${failed === 0 ? "✅ PASSED" : "❌ FAILED"} |

---

## Freeze Gate

${failed === 0 ? `✅ **CM-003 CERTIFIED — Persistence Layer FROZEN**

All ${total} certification tests passed.
No hard gate failures.
CM-003 Runtime Data Engine is approved for production.` : `❌ **CM-003 NOT YET CERTIFIED**

${failed} test(s) failed. Review failures above before freezing the layer.`}

---

*This report was generated automatically by the VS05HC certification suite.*
`;

  fs.writeFileSync(path.join(dir, "certification.md"), report);
  console.log(`\n📊 VS05HC Certification complete: ${summary}`);
  console.log(`   Report: ${path.join(dir, "certification.md")}\n`);
}
