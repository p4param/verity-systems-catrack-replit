# VS07 Prompt 005C - Execution Observability

Scope:

- Diagnostics
- Observability
- Execution metrics
- Tracing
- Correlation

This prompt freezes the observability contract layer only. It does not add execution behavior or change the workflow/runtime layering.

## Frozen Surfaces

- `IExecutionDiagnostics`
- `IExecutionMetrics`
- `IExecutionTrace`
- `IExecutionTimeline`
- `IExecutionObserver`
- `IExecutionDiagnosticsCollector`
- `IExecutionObservability` (alias to `IExecutionDiagnostics`)

## Diagnostics Model

- `ExecutionDiagnostics` snapshot includes:
	- `ExecutionCorrelation`
	- `ExecutionTrace[]`
	- `ExecutionTimeline`
	- `ExecutionMetrics`
	- `ExecutionCounters`
	- `ExecutionWarnings`
	- `ExecutionErrors`
	- `ExecutionSummary`
	- `ExecutionPerformanceSnapshot`

All diagnostics snapshots are immutable and validation-checked.

## Correlation Flow

Correlation identifiers are propagated from orchestration into execution diagnostics:

- `executionId`
- `correlationId`
- `workflowInstanceId`
- `executionHash`
- `runtimeOperationId`
- `transactionId`
- `publishVersion`

These values are passive metadata and never affect execution logic.

## Timeline Model

Timeline records are append-only traces ordered by timestamp.

Lifecycle operations:

- `ExecutionStarted`
- `PlanningStarted`
- `PlanningCompleted`
- `PipelineStarted`
- `StageStarted`
- `ExecutorSelected`
- `RuntimeOperationStarted`
- `RuntimeOperationCompleted`
- `StageCompleted`
- `PipelineCompleted`
- `ExecutionCompleted` / `ExecutionDeferred` / `ExecutionFailed`

Timeline data is read-only and used only for diagnostics.

## Metrics Model

Metrics are observational and include:

- Planning time
- Pipeline duration
- Dispatch time
- Runtime duration
- Total execution time
- Stage duration
- Executor duration
- Executed/deferred/skipped/failed counts
- Retry count (reserved; currently passive)

No metric can modify execution flow.

## Runtime Event Integration

Diagnostics publish through the existing runtime event publisher only.

Supported diagnostic events:

- `ExecutionStarted`
- `ExecutionCompleted`
- `ExecutionDeferred`
- `ExecutionFailed`
- `ExecutionCancelled`
- `ExecutionStageStarted`
- `ExecutionStageCompleted`

No delivery side effects or business actions are added.

## Logging Model

Diagnostics use the platform logger abstraction (`AppLogger`) and structured context.

Supported levels:

- `info`
- `warn`
- `error`
- `diagnostic`
- `trace`

Console logging is not used.

## Validation Rules

Diagnostics validation enforces:

- Missing `correlationId` rejection
- Duplicate trace id rejection
- Negative duration rejection
- Timeline ordering enforcement
- Missing metrics rejection
- Hash mismatch rejection
- Invalid event sequence rejection

## Contract Rules

- Correlation data is metadata only and must not change execution semantics.
- Trace data is descriptive only and must not create new execution paths.
- Metrics are observational only and must not trigger retries, branching, or persistence decisions.
- Diagnostics remain attached to execution context and results as read-only metadata.

## Performance Considerations

- Lazy diagnostics collector creation per execution request
- Lightweight in-memory accumulation
- Sampling-ready trace/metric recording model
- No reflection and no dynamic discovery
- Minimal allocations through simple immutable snapshots

Implemented sampling knobs:

- `traceSampleRate`
- `metricSampleRate`
- `maxTraceRecords`
- `maxMetricSamples`

## Deterministic Serialization

- Diagnostics snapshots are serializable through a deterministic serializer.
- Stable key ordering is enforced during JSON emission.
- Date values are normalized to ISO timestamps for reproducible export artifacts.

## Read-Only Query Facade

- In-memory diagnostics query facade is available for dashboard consumption.
- Query surfaces:
	- `getByExecutionId`
	- `getByCorrelationId`
	- `listRecent`
- Execution path writes snapshots passively after validation through a sink interface.

## Intended Use

- Capture correlation and execution identity for certification and audits.
- Record timeline and trace details for diagnosability.
- Surface execution performance metrics without modifying behavior.
