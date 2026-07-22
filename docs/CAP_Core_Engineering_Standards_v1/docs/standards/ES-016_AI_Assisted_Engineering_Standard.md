# ES-016 — AI-Assisted Engineering Standard

```
Standard Identifier : ES-016
Standard Name       : AI-Assisted Engineering Standard
Governed By         : AG-001 CAP Master Development Charter & ES-015 Engine Lifecycle Standard
Target Systems      : All CAP Platform Engines & Subsystems
Applies To          : AI Coding Assistants (Antigravity, Codex, ChatGPT, Claude) & Human Engineers
Status              : MANDATORY / CERTIFIED
Date                : 2026-07-22
```

---

## 1. Objective

This engineering standard formalizes the operational protocols, governance precedence, preflight checks, refinement workflows, pattern validation rules, certification gates, and change request procedures when developing software with AI agentic coding assistants within the CATRACK Platform.

---

## 2. Governance Hierarchy & Precedence Rules

When a conflict or ambiguity arises between specifications, standards, or prompt instructions, AI agents and human engineers MUST enforce the following strict precedence hierarchy:

```
Level 1: AG-001 Master Charter & Core Standards (ES-001 through ES-016) [HIGHEST]
   ↓
Level 2: Architecture Freeze Review (AFR-001) & Capability Contracts (CC-XXX / CFR-001)
   ↓
Level 3: Reference Implementation Specifications (RIS-001 through RIS-XXX)
   ↓
Level 4: Engineering Work Packages (EWP-XXX) & Hotfixes (HF-XXX) [LOWEST]
```

### Ambiguity & Conflict Resolution Protocols:
1. **Rule of Superior Precedence**: Lower-level deliverables (`EWP`, `HF`) CANNOT override higher-level standards (`ES`, `AFR`, `CC`).
2. **Mandatory Refinement Gate**: If an EWP specification contradicts an ES or CC contract, the AI agent MUST NOT guess or alter logic silently. It MUST trigger an **ARG-001 Architectural Refinement Pass** to align the specification before writing source code.
3. **Preserve Specification Freeze**: Do NOT rewrite specification sections for stylistic preference. Maintain specification freeze.

---

## 3. The AI Engineering Operational Protocol

```
Step 1: Bootstrap Sequence (Prompt 1 & Prompt 2 Initializers)
        ↓
Step 2: Preflight Inspection & Diagnostics
        ↓
Step 3: Architectural Refinement Pass (ARG-001 / ARG-002)
        ↓
Step 4: Implementation & Pattern Validation against RIS
        ↓
Step 5: Automated Verification & Test Suite Execution
        ↓
Step 6: Security & Invariant Audit
        ↓
Step 7: Documentation Publication (docs/VSXX/{PACKAGE}/)
        ↓
Step 8: Engine Freeze & Baseline Tagging (BL-2026-XXX)
        ↓
Step 9: ECR-Governed Maintenance (ECR-2026-XXXX)
```

---

## 4. Detailed Operational Procedures

### 4.1 Bootstrap Sequence
Every AI engineering context initialization MUST load:
- **Bootstrap Prompt 1**: Engine context, workspace mappings, repository layout, and core architectural standards.
- **Bootstrap Prompt 2**: Capability contract references, active EWP scope, testing requirements, and governance constraints.

### 4.2 Preflight Inspection & Diagnostics
Before generating or modifying source code, the AI agent MUST execute preflight checks:
1. **Database & Schema State**: Inspect `prisma/schema.prisma` and verify model compatibility.
2. **Active Code Verification**: View authoritative domain interfaces (`INotificationRepository.ts`, etc.) to prevent signature mismatch.
3. **Existing RIS Alignment**: Cross-reference existing certified reference implementations (`RIS-001`..`RIS-XXX`).

### 4.3 Architectural Refinement Pass (ARG)
Prior to code generation, execute the mandatory **ARG-001 Architectural Refinement Gate**:
- Verify repository transaction boundaries.
- Verify aggregate ownership boundaries (e.g., observational vs. operational).
- Verify snapshot immutability & OCC concurrency counters (`version BigInt`).
- Validate single-default transaction coordination.

### 4.4 Pattern Validation against RIS
All generated code MUST conform strictly to certified RIS patterns:
- **Hexagonal Layering**: Pure domain layer (`domain/`), Prisma infrastructure (`infrastructure/persistence/`), transactional application service (`application/`).
- **Domain Aggregate Root**: Static factory methods (`create`, `reconstitute`), private constructors, readonly property getters, FIFO domain event collection array (`popDomainEvents()`).
- **Prisma Repository Rules**: Hard multi-tenant parameter scoping (`tenantId`), soft delete filtering (`isDeleted: false`), atomic `$transaction` blocks, composite unique constraint handling.
- **Value Objects**: Fully immutable value objects (`RenderedContent`, `TrackingTimeline`).

### 4.5 Automated Verification & Testing Standard
- **100% Pass Rate Requirement**: All domain unit tests, repository integration tests, and application service tests MUST pass (0 failures).
- **TypeScript Strict Compilation**: `tsc --noEmit` MUST compile with zero type errors.

### 4.6 Security & Platform Invariant Audit
AI agents MUST audit every pull request / EWP against the **Platform Security Invariant**:
1. **Zero Secret Leakage**: Plaintext tokens (reset tokens, activation links, refresh tokens, API keys) MUST NEVER be printed to `console.log` or stdout.
2. **JSON Response Safety**: Refresh tokens and credentials MUST NOT be returned in JSON response bodies; HTTP-only secure cookies (`HttpOnly`, `SameSite=lax`) MUST be used.
3. **Tenant Scoping Enforcement**: 100% of master data routes and event endpoints MUST enforce tenant pre-checks (`findFirst({ where: { id, tenantId, isDeleted: false } })`).

### 4.7 Documentation Publication Workflow
Documentation generated in temporary workspace brain paths MUST be normalized and published into the project repository structure:
- **Target Folder**: `docs/VSXX/{PACKAGE_ID}/`
- **Standardized Files**:
  1. `walkthrough.md`
  2. `compliance-report.md`
  3. `review-package.md`
  4. `production-certification.md`
  5. `README.md`

### 4.8 Engine Freeze & Baseline Tagging
Upon completing all engine EWPs and HFs, the AI agent MUST execute formal engine freeze:
- Publish `ENGINE-INDEX.md`, `RIS-REGISTRY.md`, `CHANGELOG.md`.
- Record **Engine Fingerprint** (Engine ID, Version, Freeze Date, Git Tag, Commit SHA).
- Assign a **Baseline Release Tag** (e.g., `BL-2026-001`).

### 4.9 Engineering Change Request (ECR) Governance
Post-freeze modifications MUST follow the ECR schema:
```yaml
ECR Identifier : ECR-2026-XXXX
Status         : PROPOSED | APPROVED | EXECUTED
Reason         : Security Fix | Bug Fix | Capability Extension
Impacted Engine: VSXX
Target Package : HF-003+ | VSXX v1.1
Approver       : AG Governance Review Board
```

---

## 5. Governance Enforcement

> **This standard is mandatory across all AI agents and human engineers.**  
> No AI assistant may bypass preflight checks, pattern validation against RIS, test suite execution, or documentation publication requirements.
