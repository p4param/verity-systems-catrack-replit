# VS07 Prompt 005B - Execution Architecture

This diagram captures the current execution boundary after the adapter slice was isolated. It is documentation only and does not change runtime behavior.

```mermaid
flowchart LR
  subgraph Workflow[Workflow Module]
    O[WorkflowExecutionOrchestrator]
    P[IExecutionPipeline]
    M[IExecutionMapper]
    R[IWorkflowExecutorRegistry]
    E[IRuntimeApplicationExecutor / RuntimeApplicationExecutor]
    D[DeferredWorkflowExecutor]
    C[IExecutionContext]
    Q[RuntimeOperationRequest]
    S[RuntimeOperationResponse]
  end

  subgraph Runtime[Runtime Module]
    A[IRuntimeApplicationEngine]
    B[RuntimeApplicationEngine]
    U[RuntimeOperationPipeline]
    V[RuntimeRecordService]
    W[OperationDispatcher]
    X[RuntimeDataEngine]
  end

  O --> P
  O --> C
  P --> M
  P --> R
  M --> Q
  R --> E
  R --> D
  E --> Q
  E --> A
  A --> B
  B --> U
  U --> V
  U --> W
  V --> X
  S --> P

  style Workflow fill:#f7f7f7,stroke:#666,stroke-width:1px
  style Runtime fill:#eef7ff,stroke:#2b6cb0,stroke-width:1px
```

Textual dependency graph:

- `WorkflowExecutionOrchestrator` builds an immutable `ExecutionPlan` and hands it to `IExecutionPipeline`.
- `IExecutionPipeline` sequences execution stages and passes an immutable `IExecutionContext`.
- `IExecutionMapper` converts `ExecutionPlan` entries into `RuntimeOperationRequest` objects.
- `IWorkflowExecutorRegistry` resolves the executor for each request by effect type.
- `IRuntimeApplicationExecutor` translates the request and invokes only `IRuntimeApplicationEngine`.
- `IRuntimeApplicationEngine` stays inside the runtime module and reaches the runtime data layer through its own pipeline.
- The runtime module does not import workflow composition.

Boundary rule:

- Workflow depends on runtime contracts and runtime engine types.
- Runtime does not depend on workflow composition, orchestrators, registries, or execution pipeline implementations.
