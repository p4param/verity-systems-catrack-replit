# Workflow Action, Policy, and Runtime Effect Framework (VS07 Prompt 004)

## Scope

This layer is planning-only and deterministic.

It does not execute:

- Actions
- Notifications
- Escalations
- Timers
- Business logic
- Workflow runtime side effects

## Architecture

Workflow Engine

-> Workflow Action Registry

-> Workflow Action Engine

-> Workflow Policy Engine

-> Runtime Effect Graph Builder

-> Runtime Effect Planner

-> Execution Plan Builder

-> Runtime (execution deferred to Prompt 005)

## Action Framework

Action metadata supports these action types:

- StateChange
- CreateRecord
- UpdateRecord
- DeleteRecord
- CallAPI
- InvokePlatformService
- GenerateDocument
- GenerateReport
- RaiseEvent
- Notification
- Audit
- Log
- Wait
- Delay
- Timer
- Expression
- Script
- CustomAction

Providers are plugin-based and deterministic through IWorkflowActionProvider.

## Policy Framework

Policy metadata supports:

- RetryPolicy
- CompensationPolicy
- TimeoutPolicy
- EscalationPolicy
- ConcurrencyPolicy
- TransactionPolicy
- FailurePolicy
- NotificationPolicy
- AuditPolicy
- SecurityPolicy
- CachingPolicy
- CustomPolicy

Policies are immutable runtime planning artifacts generated through IWorkflowPolicyProvider.

## Runtime Effects and Execution Plan

Prompt 004 introduces deterministic runtime planning models:

- ActionPlan
- PolicyPlan
- RuntimeEffect
- RuntimeEffectSet
- EffectDependencyGraph
- EffectResolutionResult
- ExecutionPlan
- ExecutionDiagnostics
- ExecutionMetadata

The planner computes ordered effects and parallel batches from metadata dependencies only.

## Validation Rules

Prompt 004 validator checks:

- Circular action dependencies
- Duplicate actions
- Duplicate policies
- Missing providers
- Invalid retry metadata
- Invalid timeout metadata
- Invalid action references
- Conflicting policy configurations
- Orphan effects in execution graph

Action payload and policy configuration metadata now use type-specific schema checks to validate required keys and primitive types before publish.

## Publish Manifests

Publish now emits additional manifests:

- ActionManifest
- PolicyManifest
- RuntimeEffectManifest
- ExecutionManifest

These manifests are persisted within the runtime model JSON artifact (`runtime_model_json`) and never executed directly.

These are generated from immutable metadata and never execute actions.

## Plugin Model

Dependency injection composes the framework in WorkflowFoundation with explicit registries and no static mutable state.

## Prompt 005 Execution Boundary

Execution remains isolated behind `IWorkflowPlanExecutor` and a deferred executor implementation that throws if invoked. This preserves planning purity for Prompt 004 and prevents accidental side effects.
