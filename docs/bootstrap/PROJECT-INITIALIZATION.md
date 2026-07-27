# Project Initialization

**Source Lineage:** Formalized from a draft seed found at `docs/__Claude Bootstrap` during the docs/ repository migration (see `docs/project-governance/MIGRATION-LOG.md`). The original draft's intent is preserved; it has been expanded to reflect the full standard set that exists today (ES-011 through ES-017 did not exist when the draft was written) and given a proper home.

---

Before making any implementation decisions in this repository, review the project engineering standards. Do not rely on chat memory or a prior session's summary when repository documentation exists — the repository is the authoritative source of truth (see `docs/README.md`).

## Startup Sequence for a New Session

### 1. Read Engineering Standards

Read `docs/engineering-standards/README.md` first, then at minimum:

- ES-001 — Database Standards
- ES-008 — Architecture & Domain Modeling
- ES-009 — Data Ownership & Persistence Standard
- ES-010 — Platform Naming & Namespace Standard
- ES-011 — API Standards & Integration Standard
- ES-012 — Testing & Quality Standards
- ES-013 — Security Architecture Standard
- ES-014 — Engineering Work Package Implementation Standard
- ES-015 — Engine Engineering Lifecycle Standard
- ES-016 — Work Package Lifecycle Documentation Standard
- ES-017 — AI Collaboration & Assisted Engineering Standard

If the task touches presentation, runtime controls, platform services, the runtime manifest, or execution contracts, also check ES-002 through ES-007 — but note these remain thin stubs (tracked in `docs/project-governance/FOLLOW-UP-GOVERNANCE-ITEMS.md`), so don't expect binding detail there yet.

### 2. Read Bootstrap Documents (if applicable)

If the task involves the VAP/CAP platform layer specifically, read `docs/bootstrap/` in full:

- `APP-001.md`
- `Bootstrap-v3.md` (includes the pointer to `docs/project-governance/DEVELOPMENT-BOUNDARY.md` — read that too)
- `VAP-Bootstrap-v2.0.md`

### 3. Read the Current Work Package Documentation

If the task is scoped to a specific Work Package (e.g. an Inquiry Discovery workspace under `docs/catering-erp/inquiry/`), read that Work Package's own documents in order:

- `01-business-discussion.md` (if it exists — some historical Work Packages predate ES-016 and have no recorded Business Discussion; do not fabricate one if it's missing)
- `02-engineering-package.md`

These two are immutable once approved (per ES-016) — treat them as governing, not as a starting point to redesign.

### 4. Verify No Conflicts

Before implementing, confirm the request doesn't conflict with:

- `docs/project-governance/DEVELOPMENT-BOUNDARY.md` (don't restructure platform internals without being asked)
- The Discovery Boundary stated in the relevant Work Package's Engineering Package, if applicable (e.g. "Discovery is NOT Planning")
- Any Engineering Standard listed above

If a conflict exists, do not proceed silently — explain the conflict and ask for confirmation.

### 5. Begin Implementation

Follow ES-017's four-phase workflow (Research & Discovery → Design & Planning → Execution → Compilation & Verification), and ES-016's documentation lifecycle if the work constitutes a Work Package reaching Freeze.
