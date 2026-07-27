# Development Boundary

**Status:** Active

**Applies To:** All Catering ERP feature development on top of the VAP/CAP platform

**Source Lineage:** Extracted from `docs/bootstrap/Bootstrap-v3.md` (previously lines 289–336, under "Final Directive") during the docs/ repository migration, per the decision to split this into its own document. Content preserved verbatim in substance; the original file's inline "one small refinement" editing note has been folded into a single final wording below rather than left as a visible before/after draft. See `docs/project-governance/MIGRATION-LOG.md`.

---

## The Boundary

During Catering ERP development, do not spend implementation effort analyzing, validating, restructuring, or explaining VAP's internal architecture. Treat the platform as a stable framework whose internals are outside the scope of normal business feature implementation.

Unless explicitly requested, do not:

- Revisit Entity Framework boundaries
- Revisit service or repository layering
- Analyze runtime internals
- Redesign metadata infrastructure
- Propose framework abstractions
- Refactor stable platform components

## Where the effort belongs instead

During normal Catering ERP development, the primary focus is:

- Business understanding
- Business workflows
- Workspace design
- Metadata definition
- Generic runtime utilization
- Production-quality implementation

Platform changes are justified only when a real business requirement cannot be implemented cleanly using the existing platform — and only then after the gap is explicitly surfaced and confirmed, not silently worked around by touching platform internals.

Platform internals are only revisited when explicitly instructed, or when a genuine business requirement exposes a verified platform gap.

## Why this exists

Every platform improvement must be justified by a real business requirement discovered during Catering ERP development, not by a desire to improve the platform for its own sake.

> A related, not-yet-completed idea — "Experience-Driven Design" — appears immediately after this section in the original `Bootstrap-v3.md` as a bare heading with no body. It was left as-is rather than completed here, since inventing its content would not be preserving engineering intent — it would be fabricating a document that was never written.
