# VS07 Workflow Architecture Guide

Date: 2026-07-15
Version: 1.0
Status: Certified (Prompt 006E — Final)

## Purpose

This guide defines the certified architecture for the CAP Workflow Engine (VS07) and its runtime boundaries.

## Layered Architecture

1. Metadata and Publish Layer
2. Runtime Manifest and Graph Layer
3. Planning Layer (participants, assignments, actions, policies)
4. Execution Runtime Layer (orchestrator, pipeline, dispatch, adapter)
5. Diagnostics and Observability Layer

## Composition Root

The single authoritative wiring point for all workflow engine components is:

- `createWorkflowFoundation()` in `src/modules/platform/workflow/runtime/WorkflowFoundation.ts`

This function instantiates and wires all services, registries, providers, stages, and the orchestrator. Callers receive the `WorkflowFoundation` interface exposing all certified engine surfaces.

## Dependency Direction

- Workflow module depends on runtime contracts for execution integration.
- Runtime application module does not compose workflow internals.
- Business and UI modules are not dependencies of workflow execution internals.

## Manifest-First Rule

Execution path consumes runtime manifest/runtime model only.

Designer metadata is not read directly by runtime execution flow.

## Boundary Rules

- Planning is deterministic and side-effect-free.
- Execution is pipeline-mediated.
- Runtime adapter is boundary-only.
- Diagnostics are observational and non-influential.
- Repository access remains behind workflow repository contracts.

## Public Contracts

- Public contracts are exported via `src/modules/platform/workflow/contracts/index.ts`.
- Prompt 006E certification confirms no breaking contract changes and no duplicate contract exports.
- 89 named exports confirmed; no duplicates.

## Certification Trace

Architecture has been certified incrementally through:

- Prompt 001: foundation
- Prompt 002: state machine
- Prompt 003: participant and assignment
- Prompt 004: action and policy
- Prompt 005: execution runtime
- Prompt 006A: metadata and publish
- Prompt 006B: runtime graph
- Prompt 006C: planning
- Prompt 006D: end-to-end integration
- Prompt 006E: final certification

## CAP v1.0 Notes

- Architecture is frozen for VS07 completion.
- Future improvements should preserve current dependency direction and manifest-first execution principles.
- Root barrel exports `tests` intentionally for v1.0; future version may tighten this surface.
