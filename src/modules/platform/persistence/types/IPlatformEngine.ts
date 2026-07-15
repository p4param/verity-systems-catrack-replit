/**
 * CM-003 Runtime Data Engine — Platform Engine Base Contract
 *
 * Every major CAP platform engine implements this interface.
 * Provides consistent lifecycle management, health reporting, and diagnostics
 * across all engines in the CM-001 through CM-016 roadmap.
 *
 * Examples:
 *   RuntimeDataEngine, SchemaPlatformEngine, WorkflowEngine,
 *   ValidationEngine, NotificationEngine, SearchEngine, AIEngine
 *
 * Standards: ES-008
 */

export interface EngineHealth {
  /** Whether the engine is ready to serve requests. */
  healthy: boolean;
  /** Human-readable status description. */
  status: string;
  /** Optional per-component health details. */
  details?: Record<string, { healthy: boolean; message?: string }>;
  /** Timestamp of the health check. */
  checkedAt: Date;
}

export interface EngineDiagnostics {
  /** Engine name. Example: "CM-003 Runtime Data Engine" */
  engineName: string;
  /** Semantic version. Example: "1.0.0" */
  version: string;
  /** ISO8601 engine startup time. */
  startedAt: string;
  /** Current health snapshot. */
  health: EngineHealth;
  /** Implementation-specific diagnostic data. */
  metadata: Record<string, any>;
}

/**
 * Base contract for all CAP platform engines.
 *
 * CF alignment:
 *   CF-005 Diagnostics — health() and diagnostics() methods
 *   CF-006 Configuration — initialize() accepts configuration
 */
export interface IPlatformEngine {
  /**
   * Called during application startup to initialize the engine.
   * Must be idempotent — safe to call multiple times.
   */
  initialize(): Promise<void>;

  /**
   * Called during graceful shutdown.
   * Should flush pending operations, close connections, etc.
   */
  shutdown(): Promise<void>;

  /**
   * Returns current health status.
   * Used by: platform diagnostics page, load balancer health checks, k8s probes.
   */
  health(): Promise<EngineHealth>;

  /**
   * Returns the engine's semantic version.
   */
  version(): string;

  /**
   * Returns comprehensive diagnostic information.
   * Used by: platform admin panel, support tooling, automated monitoring.
   */
  diagnostics(): Promise<EngineDiagnostics>;
}
