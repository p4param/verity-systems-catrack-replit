# ES-017 — AI Collaboration & Assisted Engineering Standard

**Standard ID:** ES-017

**Title:** AI Collaboration & Assisted Engineering Standard

**Status:** Active

**Applies To:** All AI coding agents and assistants working in this repository

**Owner:** Product Engineering

**Source Lineage:** Migrated from AG Brain `catrack_ai_development_playbook.md` (originally "Catrack AI Development Playbook, CPP-011") as part of the docs/ repository migration. Content preserved; reformatted to the ES-0xx standard template.

> [!IMPORTANT]
> This standard was assigned **ES-017**, not ES-016, to resolve an ID collision discovered during migration: `docs/Governance/ES/ES-016_AI_Assisted_Engineering_Standard.md` was a 3-line stub reserving "ES-016" for this exact topic, while a fully-written **Work Package Lifecycle Documentation Standard** had already been adopted as ES-016 in `docs/engineering-standards/`. The stub is archived at `docs/Archive/superseded-governance-stubs/ES-016_AI_Assisted_Engineering_Standard.stub.md`. See `docs/project-governance/MIGRATION-LOG.md` for the full resolution record. ES-016 and ES-017 are companion standards: ES-016 governs *what documentation* a Work Package must produce; this standard (ES-017) governs *how an AI agent* should behave while doing the engineering work that produces it.

---

## 1. Vision & Objectives

This standard defines the rules of engagement for AI coding agents and software developers working on the Catrack ERP platform — automated code generation, repository analysis, and quality assurance.

### Core Objectives
- **Prevent Code Sprawl:** Do not write duplicate business logic or redundant utility helpers.
- **Maintain Type Safety:** Enforce strict TypeScript rules and complete interfaces.
- **Ensure Production Quality:** No placeholder code, mock components, or unfinished `TODO` annotations in shipped changes.
- **Standardize Workflows:** Follow a structured process of research, planning, execution, and verification.

---

## 2. Core Rules for AI Agents

- **Golden Rule of Reusability:** Before writing any utility, component, database query, or validation helper, search the repository for an existing implementation. Extend existing structures instead of writing new ones.
- **No Placeholders:** Generated code must be complete and production-ready. Comments like `// TODO: implement later` are prohibited.
- **Strict Type Safety:** Always write explicit types and generic parameters. Avoid `any` or implicit type variables.
- **Automated Verification:** Verify code compiles cleanly without errors or warnings before presenting it as done.

---

## 3. Context Gathering & Repository Analysis

Before modifying any file:

```
Read Request
     |
     v
Search Codebase (grep/glob) --(match)--> View target files & schema models
     |
  (no match)
     v
Check Types --(verify)--> Confirm locations & naming styles
```

- **Locating Targets:** Search the repository to identify relevant files, API endpoints, types, and schema fields before editing.
- **Schema Verification:** Verify the actual database model structure (`schema.prisma`) before editing queries or backend routes.
- **Analyzing Conventions:** Follow the coding style, import grouping, and file structure of adjacent files in the target module.

---

## 4. Implementation Workflow

Four distinct phases:

1. **Research & Discovery** — identify all files to be modified, created, or deleted; verify dependencies exist in `package.json`.
2. **Design & Planning** — write a clear implementation plan (target changes, data impacts, test plan); present it for approval before non-trivial work.
3. **Execution** — perform targeted, minimal-diff code modifications; clean up unused imports.
4. **Compilation & Verification** — run local type checking (`tsc --noEmit`) and relevant test suites; summarize changes, verification output, and results.

---

## 5. Coding & File Modification Standards

- **Targeted Replacements:** Prefer targeted edits over rewriting whole files for small changes.
- **Documentation:** Exported functions, hooks, repositories, and services should carry clear documentation comments where the *why* isn't obvious from the code itself.
- **Consistent Imports:** Group imports logically — framework imports, then third-party dependencies, then internal components/utilities.

---

## 6. Automated Quality Verification Gates

- **TypeScript Check:** `npx tsc --noEmit` — any type errors fail the change.
- **Linter Audit:** ESLint — style violations fail the change.
- **Test Run:** Unit/integration suites — failing tests block the change.

---

## 7. Communication & Documentation Standards

- **Direct Answers:** Keep responses concise and focused on the technical implementation.
- **Clickable File Links:** Reference code files/directories as clickable links where the interface supports it.
- **Artifact Generation:** Large reports, plans, and walkthrough summaries belong in files (see ES-016), not sprawled across chat.

---

## 8. Code Review Guidelines for AI Actions

Reviewers (human or AI) verify agent changes meet these standards:

- [ ] Code Duplication — reuses existing helpers, hooks, and services?
- [ ] Type Safety — all variables and parameters explicitly typed?
- [ ] Quality Check — complete, no `TODO` comments?
- [ ] Test Coverage — unit/integration tests included for new features?
- [ ] Build Verification — TypeScript compiler runs without errors?
