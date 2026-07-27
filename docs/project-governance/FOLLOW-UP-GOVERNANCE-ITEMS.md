# Follow-Up Governance Items

Tracked gaps and pending decisions surfaced during the docs/ repository migration (see `MIGRATION-LOG.md`). These are intentionally **not resolved** here — each needs a deliberate decision or a dedicated piece of work, not a migration-time guess.

---

## 1. DDS-001 — Discovery Design Standard (not authored)

Referenced by name ("following DDS-001 (Discovery Design Standard)") in every Inquiry Discovery Workspace engineering package (Decor & Ambience, Service Experience), but **no standalone DDS-001 document exists anywhere** — not in this repository, not in the AG Brain historical archive. It has only ever existed as an inline citation.

Per Phase 2/3 migration decisions, this was explicitly **not authored** during migration. When it is written, it should be extracted from the pattern already consistently repeated across the shipped Discovery workspaces (6-card guided conversation shell, Insight Assistant sidebar, non-blocking informational weighting, Structured Business Summary, Suggested Activities) rather than designed from scratch — the pattern already exists in five shipped implementations; DDS-001 just needs to name it.

**Owner:** unassigned. **Status:** open.

---

## 2. ADR (Architecture Decision Record) structure — recommended, not created

`docs/architecture/decisions/` was recommended as the future home for ADRs (one file per decision, e.g. `0001-title.md`, using a Status/Context/Decision/Consequences template) but the folder was not created and no ADR content was authored. This repository currently has no mechanism for recording *why* an architectural choice was made, only *what* the choice is (via ES-xxx standards and the architecture docs).

**Owner:** unassigned. **Status:** open, recommendation only.

---

## 3. ES-002 through ES-007 remain thin stubs

Moved into `docs/engineering-standards/` as part of this migration, but their content is unchanged — still 9–14 line placeholders (Presentation Standards, Runtime Controls, Platform Services, Runtime Manifest, Database Platform Engine, Runtime Execution Contracts). Migration scope was AG Brain content, not authoring new platform-core standards from nothing; these six have no AG Brain source to migrate from.

**Owner:** unassigned. **Status:** open, gap acknowledged.

---

## 4. Bootstrap-v3.md's dangling "Experience-Driven Design" section

The last line of `docs/bootstrap/Bootstrap-v3.md` is a bare heading, "Experience-Driven Design," with no body — the original document simply stops there. Left as-is during migration per "do not fabricate missing historical artifacts." If this concept is meant to be a real, documented principle, it needs to be written, not inferred.

**Owner:** unassigned. **Status:** open.

---

## 5. Items pending verification before further action

These were flagged during Phase 1 inventory as needing a factual check against the live codebase before a final KEEP/ARCHIVE/OBSOLETE call — not yet performed:

- **`catrack_devops_and_deployment.md`** (AG Brain) — assumes bare-metal Hetzner/Docker/Nginx hosting. Needs diffing against `docs/Deployment/README.md` to see if that's already the real source of truth, before this is merged or archived.
- **`catrack_enterprise_ui_ux_design_system.md`** (AG Brain) — contains concrete design tokens (hex colors, fonts) proposed to fill the ES-002 stub. Needs diffing against the actual Tailwind/CSS config in `src/` before treating those specific values as binding.
- **VS08 EWP-002 through EWP-007 review/compliance artifacts** — AG Brain has `RP-002` through `RP-008_Review_Package.md`, but it was not confirmed per-file whether each review package already contains compliance-report-equivalent content, or whether a separate compliance report is genuinely missing for each. Needs a file-by-file check before those subfolders are populated (tracked separately from this migration's Platform-Engines work — see `MIGRATION-LOG.md` for what was and wasn't migrated in this pass).

**Owner:** unassigned. **Status:** open.

---

## 6. "Phase U1/U2/U3 — UI Foundation & Search Shell" (AG Brain, session `ed620c00...`)

Terminology doesn't match any VS-numbered engine or anything else in this repository's governance. The U1 report itself states the work "VIOLATES Phase U1 specifications" and is "NON-COMPLIANT." Archived pending confirmation this isn't active, unrelated work that was simply never connected to the Catrack VS-engine numbering — it may belong to a different project entirely, similar to the "Verity DMS" material excluded from this migration.

**Owner:** unassigned. **Status:** open, scope unconfirmed.

---

## 7. `catrack_domain_model_and_ubiquitous_language.md` split

Migrated as a single `docs/architecture/domain-glossary.md` for now. Phase 1 recommended splitting it into a stable terminology glossary versus a domain-boundary map (which will evolve per Business Work Package) — that split was not performed during this migration pass.

---

## 8. AG-000 vs AG-001 governance identifier mismatch

The Master Development Charter is filed and titled `AG-000-CAP-Master-Development-Charter.md`, but roughly 30 other documents across `docs/ENGINES.md`, `docs/engineering-standards/ES-014-...`, `docs/engineering-standards/ES-015-...`, and the entire `docs/Platform-Engines/VS08/` and `docs/Platform-Engines/VS09/` trees consistently cite it as **"AG-001."** This predates the docs/ repository migration — the file was relocated, not renamed or re-identified. Surfaced during the Repository Governance Audit (2026-07-27). Not resolved here — resolving it means deciding whether ~30 citing documents are wrong or the charter's own ID is wrong, which is a governance decision, not a cleanup task.

**Owner:** unassigned. **Status:** open, not yet decided.

---

## 9. ES heading style normalization (ES-001–008 vs ES-009–017)

ES-001 through ES-008 title their H1 as `# ES-00X --- Title` (three hyphens). ES-009 through ES-017 use a proper em-dash (`# ES-00X — Title`). Pre-existing inconsistency, not introduced by the migration, but now more visible with all 17 standards consolidated into one folder. Surfaced during the Repository Governance Audit (2026-07-27).

**Owner:** unassigned. **Status:** open.

---

## 10. Missing Markdown H1 marker in ES-014

`docs/engineering-standards/ES-014-engineering-work-package-implementation-standard.md` opens with plain text ("ES-014 — Engineering Work Package Implementation Standard") rather than a `#`-prefixed Markdown heading. Pre-existing defect, carried over unmodified during the migration (content was moved, not rewritten). Surfaced during the Repository Governance Audit (2026-07-27).

**Owner:** unassigned. **Status:** open.

---

## 11. ES-015 title wording consistency

ES-015's actual document title is "Engine Engineering Lifecycle **& Governance** Standard," but `docs/engineering-standards/README.md`, `docs/bootstrap/PROJECT-INITIALIZATION.md`, and the file's own migrated filename (`ES-015-engine-engineering-lifecycle-standard.md`) all drop "& Governance." Introduced during the docs/ repository migration (a renaming choice during the Phase 4 file move didn't match the document's internal title). Surfaced during the Repository Governance Audit (2026-07-27).

**Owner:** unassigned. **Status:** open.

---

## 12. Documentation README completeness verification — add to future governance audits

`docs/README.md` was found incomplete during the first Repository Governance Audit (missing several top-level entries) and was corrected in a follow-up cleanup pass. Future governance audits should include an explicit check that `docs/README.md` (and other folder-level READMEs) still accurately reflect the current top-level structure, since new top-level files/folders can be added without anyone updating the map.

**Owner:** unassigned. **Status:** open, process recommendation.

**Owner:** unassigned. **Status:** open.
