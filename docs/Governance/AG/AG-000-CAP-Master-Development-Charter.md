# AG-000 --- CAP Master Development Charter

## Purpose

This charter governs all implementation work for the Catrack Application
Platform (CAP).

## Vision

Build a generic enterprise metadata-driven application platform.
Business applications must never introduce business logic into the
platform core.

## Mandatory Principles

-   Metadata First
-   Manifest First Runtime
-   Published Metadata Only
-   Zero Business Code
-   Plugin Architecture
-   Deterministic Runtime
-   Immutable Contracts
-   Layered Architecture
-   Tenant First

## Mandatory Development Lifecycle

Vision → Blueprint → Architecture → ADR → Domain Models → Runtime Design
→ Implementation → Review → Certification → Freeze.

## Coding Rules

-   Production-ready only.
-   No TODOs or placeholder implementations.
-   Preserve architecture.
-   Validate build, lint and tests before completion.

## Completion Report

Include summary, files changed, architecture impact, validation and next
steps.
