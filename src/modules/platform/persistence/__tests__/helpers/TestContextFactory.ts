/**
 * VS05HC Certification — Test Context & Artifact Factory
 *
 * Builds PersistenceExecutionContext objects and certification JSON artifacts.
 */
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import { execSync } from "child_process";
import type { PersistenceExecutionContext } from "@/modules/platform/persistence/types/PersistenceExecutionContext";
import { TEST_TENANT_ID, TEST_TENANT_B_ID, TEST_USER_ID, TEST_USER_B_ID } from "./TestManifestFactory";

// ─── Context Factories ────────────────────────────────────────────────────────

export function buildCtx(
  overrides: Partial<PersistenceExecutionContext> = {}
): PersistenceExecutionContext {
  return {
    tenantId: TEST_TENANT_ID,
    userId: TEST_USER_ID,
    requestId: `req-${Date.now()}`,
    correlationId: `corr-${Date.now()}`,
    ...overrides,
  };
}

export function buildTenantBCtx(): PersistenceExecutionContext {
  return buildCtx({ tenantId: TEST_TENANT_B_ID, userId: TEST_USER_B_ID });
}

export function buildCtxWithUser(userId: string): PersistenceExecutionContext {
  return buildCtx({ userId });
}

// ─── Benchmark Helpers ────────────────────────────────────────────────────────

export interface LatencyStats {
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  avg: number;
  samples: number;
}

/**
 * Runs `fn` N times and returns P50/P95/P99 latency stats in milliseconds.
 */
export async function measureLatency(fn: () => Promise<any>, runs = 20): Promise<LatencyStats> {
  const times: number[] = [];
  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    await fn();
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  const p = (pct: number) => times[Math.ceil(times.length * pct / 100) - 1] ?? 0;
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  return {
    p50: Math.round(p(50)),
    p95: Math.round(p(95)),
    p99: Math.round(p(99)),
    min: Math.round(times[0]),
    max: Math.round(times[times.length - 1]),
    avg: Math.round(avg),
    samples: runs,
  };
}

// ─── Certification Artifact Builder ──────────────────────────────────────────

export interface GateResult {
  id: string;
  area: string;
  type: "HARD" | "INFORMATIONAL";
  passed: boolean;
  durationMs?: number;
  details?: string;
}

export interface BenchmarkResult {
  id: string;
  name: string;
  stats: LatencyStats;
  target: Record<string, number>;
  withinTarget: boolean;
  hardFailThreshold?: number;
  hardFailed: boolean;
}

class CertificationArtifactBuilder {
  private gates: GateResult[] = [];
  private benchmarks: BenchmarkResult[] = [];
  private startedAt = new Date().toISOString();

  recordGate(gate: GateResult): void {
    this.gates.push(gate);
  }

  recordBenchmark(bench: BenchmarkResult): void {
    this.benchmarks.push(bench);
  }

  private getGitCommit(): string {
    try {
      return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
    } catch {
      return "unknown";
    }
  }

  private getEngineVersion(): string {
    try {
      const { RuntimeDataEngine } = require("@/modules/platform/persistence");
      return new RuntimeDataEngine().version();
    } catch {
      return "unknown";
    }
  }

  buildEnvironment(postgresVersion: string) {
    return {
      node: process.version,
      postgres: postgresVersion,
      cpu: os.cpus()[0]?.model ?? "unknown",
      ramMB: Math.round(os.totalmem() / 1024 / 1024),
      platform: os.platform(),
      arch: os.arch(),
    };
  }

  buildReport(postgresVersion: string) {
    const hardGates = this.gates.filter(g => g.type === "HARD");
    const infoGates = this.gates.filter(g => g.type === "INFORMATIONAL");
    const hardPassed = hardGates.filter(g => g.passed).length;
    const hardFailed = hardGates.filter(g => !g.passed).length;
    const benchHardFailed = this.benchmarks.filter(b => b.hardFailed).length;

    return {
      certificationVersion: "1.0",
      module: "CM-003",
      engineVersion: this.getEngineVersion(),
      gitCommit: this.getGitCommit(),
      generatedAt: new Date().toISOString(),
      startedAt: this.startedAt,
      passed: hardFailed === 0 && benchHardFailed === 0,
      environment: this.buildEnvironment(postgresVersion),
      hardGates: {
        total: hardGates.length,
        passed: hardPassed,
        failed: hardFailed,
      },
      informationalGates: {
        total: infoGates.length,
        withinTarget: infoGates.filter(g => g.passed).length,
        exceedTarget: infoGates.filter(g => !g.passed).length,
        hardFailed: 0,
      },
      benchmarks: {
        total: this.benchmarks.length,
        withinTarget: this.benchmarks.filter(b => b.withinTarget).length,
        hardFailed: benchHardFailed,
      },
      gates: this.gates,
    };
  }

  writeArtifacts(postgresVersion: string, dir = "VS05HC"): void {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const report = this.buildReport(postgresVersion);
    fs.writeFileSync(path.join(dir, "certification.json"), JSON.stringify(report, null, 2));
    fs.writeFileSync(
      path.join(dir, "benchmark.json"),
      JSON.stringify({ benchmarks: this.benchmarks }, null, 2)
    );
    fs.writeFileSync(
      path.join(dir, "environment.json"),
      JSON.stringify(this.buildEnvironment(postgresVersion), null, 2)
    );
  }
}

export const certArtifacts = new CertificationArtifactBuilder();
