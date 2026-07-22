/**
 * VS05HC Certification — Jest Configuration with CI Profiles
 *
 * Execution Profiles:
 *   smoke        Unit tests only — ~30 sec (pre-commit, PR checks)
 *   developer    Unit + Integration — ~5 min (local dev, branch CI)
 *   certification All tiers except long-running — ~20-40 min (release gate)
 *   nightly      Everything including performance + memory — ~2-4 hr
 *
 * Run: npm test -- --profile=smoke
 *      npm test -- --profile=developer
 *      npm test -- --profile=certification
 *      npm test -- --profile=nightly
 *
 * Default (no --profile): developer profile
 */

const profile = (() => {
  const arg = process.argv.find(a => a.startsWith("--profile="));
  return arg ? arg.split("=")[1] : (process.env.TEST_PROFILE ?? "developer");
})();

// ─── Test path patterns per profile ──────────────────────────────────────────

const PROFILES = {
  smoke: [
    "<rootDir>/src/modules/platform/persistence/__tests__/unit/**/*.test.ts",
    "<rootDir>/src/modules/platform/runtime/application/__tests__/**/*.test.ts",
    "<rootDir>/src/modules/platform/workflow/tests/**/*.test.ts",
    // VS08A: Catalog & Tenant aggregates — unit tests only (no DB required)
    "<rootDir>/src/modules/platform/catalog/tests/*.test.ts",
    "<rootDir>/src/modules/platform/tenant/tests/*.test.ts",
  ],
  developer: [
    "<rootDir>/src/modules/platform/persistence/__tests__/unit/**/*.test.ts",
    "<rootDir>/src/modules/platform/persistence/__tests__/integration/**/*.test.ts",
    "<rootDir>/src/modules/platform/runtime/application/__tests__/**/*.test.ts",
    "<rootDir>/src/modules/platform/workflow/tests/**/*.test.ts",
    // VS08A: Catalog & Tenant aggregates — unit + integration tests
    "<rootDir>/src/modules/platform/catalog/tests/*.test.ts",
    "<rootDir>/src/modules/platform/catalog/tests/integration/*.test.ts",
    "<rootDir>/src/modules/platform/tenant/tests/*.test.ts",
    "<rootDir>/src/modules/platform/tenant/tests/integration/*.test.ts",
  ],
  certification: [
    "<rootDir>/src/modules/platform/persistence/__tests__/unit/**/*.test.ts",
    "<rootDir>/src/modules/platform/persistence/__tests__/integration/**/*.test.ts",
    "<rootDir>/src/modules/platform/persistence/__tests__/concurrency/**/*.test.ts",
    "<rootDir>/src/modules/platform/persistence/__tests__/regression/**/*.test.ts",
    "<rootDir>/src/modules/platform/persistence/__tests__/operational/**/*.test.ts",
    "<rootDir>/src/modules/platform/runtime/application/__tests__/**/*.test.ts",
    "<rootDir>/src/modules/platform/workflow/tests/**/*.test.ts",
    // VS08A: Catalog & Tenant aggregates — unit + integration tests
    "<rootDir>/src/modules/platform/catalog/tests/*.test.ts",
    "<rootDir>/src/modules/platform/catalog/tests/integration/*.test.ts",
    "<rootDir>/src/modules/platform/tenant/tests/*.test.ts",
    "<rootDir>/src/modules/platform/tenant/tests/integration/*.test.ts",
  ],
  nightly: [
    "<rootDir>/src/modules/platform/persistence/__tests__/**/*.test.ts",
    "<rootDir>/src/modules/platform/runtime/application/__tests__/**/*.test.ts",
    "<rootDir>/src/modules/platform/workflow/tests/**/*.test.ts",
    // VS08A: Catalog & Tenant aggregates — unit + integration tests
    "<rootDir>/src/modules/platform/catalog/tests/*.test.ts",
    "<rootDir>/src/modules/platform/catalog/tests/integration/*.test.ts",
    "<rootDir>/src/modules/platform/tenant/tests/*.test.ts",
    "<rootDir>/src/modules/platform/tenant/tests/integration/*.test.ts",
    // VS08B: Commercial aggregate — unit + integration tests
    "<rootDir>/src/modules/platform/commercial/tests/**/*.test.ts",
  ],
};

const testMatch = PROFILES[profile] ?? PROFILES.developer;

console.log(`\n🔬 VS05HC Test Profile: ${profile.toUpperCase()} — ${testMatch.length} test pattern(s)\n`);

module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.json" }],
  },
  testMatch,
  testTimeout: profile === "nightly" ? 600_000 : 60_000,
  maxWorkers: profile === "nightly" ? 1 : "50%", // serial for nightly stability
  verbose: true,
  reporters: [
    "default",
    // JSON reporter for certification artifacts
    ...(profile === "certification" || profile === "nightly"
      ? [["jest-json-results-reporter", { outputFile: "VS05HC/jest-results.json" }]]
      : []),
  ],
  // Global setup/teardown for certification artifact finalization
  ...(profile === "certification" || profile === "nightly"
    ? {
        globalSetup: "<rootDir>/src/modules/platform/persistence/__tests__/helpers/globalSetup.ts",
        globalTeardown: "<rootDir>/src/modules/platform/persistence/__tests__/helpers/globalTeardown.ts",
      }
    : {}),
  coverageDirectory: "VS05HC/coverage",
  collectCoverageFrom: [
    "src/modules/platform/persistence/**/*.ts",
    "src/modules/platform/runtime/application/**/*.ts",
    "src/modules/platform/workflow/**/*.ts",
    // VS08A: PlatformApplication aggregate
    "src/modules/platform/catalog/**/*.ts",
    "!src/modules/platform/persistence/__tests__/**",
    "!src/modules/platform/runtime/application/__tests__/**",
    "!src/modules/platform/workflow/tests/**",
    "!src/modules/platform/catalog/tests/**",
    "!src/modules/platform/persistence/index.ts",
    "!src/modules/platform/runtime/application/index.ts",
    "!src/modules/platform/workflow/index.ts",
    "!src/modules/platform/catalog/index.ts",
  ],
};
